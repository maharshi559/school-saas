import type { FastifyInstance } from "fastify";
import { systemPrisma } from "@iskool/db";
import { z } from "zod";

const businessFields = {
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  schoolType: z.enum(["PRIMARY", "SECONDARY", "SENIOR_SECONDARY", "INTERNATIONAL", "OTHER"]).optional(),
  board: z.enum(["CBSE", "ICSE", "IB", "STATE", "OTHER"]).optional(),
  establishedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
};

const createTenantSchema = z.object({
  name: z.string().min(1, "School name is required"),
  adminFirstName: z.string().min(1, "Admin first name is required"),
  adminLastName: z.string().min(1, "Admin last name is required"),
  adminPhone: z.string().min(10, "Phone number is required"),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"]).default("TRIAL"),
  ...businessFields,
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"]).optional(),
  adminFirstName: z.string().min(1).optional(),
  adminLastName: z.string().optional(),
  ...businessFields,
});

const updateAdminPhoneSchema = z.object({
  adminPhone: z.string().min(10, "Phone number is required"),
});

export async function adminRoutes(app: FastifyInstance) {
  const adminOnly = [app.authenticate, app.requireAppRole(["APP_ADMIN"])];

  // List all tenants
  app.get("/admin/tenants", { preHandler: adminOnly }, async (_request, reply) => {
    const tenants = await (systemPrisma as any).tenant.findMany({
      where: { deletedAt: null },
      select: {
        id: true, name: true, slug: true, schoolCode: true, phone: true,
        email: true, address: true, city: true, state: true, pincode: true,
        website: true, schoolType: true, board: true, establishedYear: true,
        status: true, createdAt: true,
        _count: { select: { memberships: true, students: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const tenantsWithAdmin = await Promise.all(
      tenants.map(async (tenant: any) => {
        const adminMembership = await systemPrisma.membership.findFirst({
          where: { tenantId: tenant.id, role: "SCHOOL_ADMIN" },
          include: { user: true },
        });
        return {
          ...tenant,
          adminName: adminMembership?.user?.displayName || "N/A",
          adminPhone: adminMembership?.user?.phone || tenant.phone,
        };
      })
    );

    return reply.send({ items: tenantsWithAdmin });
  });

  // Create a new tenant
  app.post("/admin/tenants", { preHandler: adminOnly }, async (request, reply) => {
    const parsed = createTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    }

    const { name, adminFirstName, adminLastName, adminPhone, status, email, address, city, state: stateField, pincode, website, schoolType, board, establishedYear } = parsed.data;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const schoolCode = `${name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`;

    try {
      const tenant = await (systemPrisma as any).tenant.create({
        data: {
          name, slug, schoolCode, phone: adminPhone, status,
          ...(email && { email }),
          ...(address && { address }),
          ...(city && { city }),
          ...(stateField && { state: stateField }),
          ...(pincode && { pincode }),
          ...(website && { website }),
          ...(schoolType && { schoolType }),
          ...(board && { board }),
          ...(establishedYear && { establishedYear }),
        },
      });

      const schoolAdmin = await systemPrisma.user.upsert({
        where: { phone: adminPhone },
        update: { displayName: `${adminFirstName} ${adminLastName}` },
        create: { phone: adminPhone, displayName: `${adminFirstName} ${adminLastName}` },
      });

      await systemPrisma.membership.create({
        data: { tenantId: tenant.id, userId: schoolAdmin.id, role: "SCHOOL_ADMIN", status: "ACTIVE" },
      });

      return reply.code(201).send({
        id: tenant.id, name: tenant.name, slug: tenant.slug,
        schoolCode: tenant.schoolCode, status: tenant.status,
        adminName: `${adminFirstName} ${adminLastName}`, adminPhone,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return reply.code(409).send({ error: "conflict", message: "School name or code already exists" });
      }
      throw error;
    }
  });

  // Update tenant
  app.patch("/admin/tenants/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    }

    try {
      const { adminFirstName, adminLastName, ...tenantData } = parsed.data;
      const tenant = await (systemPrisma as any).tenant.update({ where: { id }, data: tenantData });

      let adminName: string | undefined;
      if (adminFirstName !== undefined) {
        const membership = await systemPrisma.membership.findFirst({
          where: { tenantId: id, role: "SCHOOL_ADMIN" },
        });
        if (membership) {
          const displayName = `${adminFirstName} ${adminLastName ?? ""}`.trim();
          await systemPrisma.user.update({ where: { id: membership.userId }, data: { displayName } });
          adminName = displayName;
        }
      }

      return reply.send({ ...tenant, ...(adminName !== undefined && { adminName }) });
    } catch (error: any) {
      if (error.code === "P2025") return reply.code(404).send({ error: "not_found" });
      throw error;
    }
  });

  // Soft delete tenant
  app.delete("/admin/tenants/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await systemPrisma.tenant.update({ where: { id }, data: { deletedAt: new Date() } });
      return reply.code(204).send();
    } catch (error: any) {
      if (error.code === "P2025") return reply.code(404).send({ error: "not_found" });
      throw error;
    }
  });

  // Update school admin phone
  app.patch("/admin/tenants/:id/admin-phone", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateAdminPhoneSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    }

    const { adminPhone } = parsed.data;

    try {
      const membership = await systemPrisma.membership.findFirst({
        where: { tenantId: id, role: "SCHOOL_ADMIN" },
        include: { user: true },
      });

      if (!membership) {
        return reply.code(404).send({ error: "not_found", message: "School admin not found" });
      }

      const existingUser = await systemPrisma.user.findFirst({
        where: { phone: adminPhone, id: { not: membership.userId } },
      });

      if (existingUser) {
        return reply.code(409).send({ error: "conflict", message: "Phone number already in use" });
      }

      const updatedUser = await systemPrisma.user.update({
        where: { id: membership.userId },
        data: { phone: adminPhone },
      });

      return reply.send({ adminName: updatedUser.displayName, adminPhone: updatedUser.phone });
    } catch (error: any) {
      if (error.code === "P2025") return reply.code(404).send({ error: "not_found" });
      throw error;
    }
  });
}
