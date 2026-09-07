import type { FastifyInstance } from "fastify";
import { systemPrisma } from "@school/db";
import { z } from "zod";

const ADMIN_PHONES = process.env.ADMIN_PHONES?.split(",") || ["+919999900001"];

const createTenantSchema = z.object({
  name: z.string().min(1, "School name is required"),
  adminFirstName: z.string().min(1, "Admin first name is required"),
  adminLastName: z.string().min(1, "Admin last name is required"),
  adminPhone: z.string().min(10, "Phone number is required"),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"]).default("TRIAL"),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"]).optional(),
});

const updateAdminPhoneSchema = z.object({
  adminPhone: z.string().min(10, "Phone number is required"),
});

async function isAppAdmin(phone: string): Promise<boolean> {
  return ADMIN_PHONES.includes(phone);
}

export async function adminRoutes(app: FastifyInstance) {
  // List all tenants (app-level admin only)
  app.get(
    "/admin/tenants",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const isAdmin = await isAppAdmin(request.currentUser.phone);
      if (!isAdmin) {
        return reply.code(403).send({ error: "forbidden", message: "Admin access required" });
      }

      const tenants = await systemPrisma.tenant.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          schoolCode: true,
          phone: true,
          status: true,
          createdAt: true,
          _count: { select: { memberships: true, students: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Enrich with admin details
      const tenantsWithAdmin = await Promise.all(
        tenants.map(async (tenant) => {
          const adminMembership = await systemPrisma.membership.findFirst({
            where: {
              tenantId: tenant.id,
              role: "SCHOOL_ADMIN",
            },
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
    }
  );

  // Create a new tenant (app-level admin only)
  app.post(
    "/admin/tenants",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const isAdmin = await isAppAdmin(request.currentUser.phone);
      if (!isAdmin) {
        return reply.code(403).send({ error: "forbidden", message: "Admin access required" });
      }

      const parsed = createTenantSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      const { name, adminFirstName, adminLastName, adminPhone, status } = parsed.data;

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const schoolCode = `${name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`;

      try {
        const tenant = await systemPrisma.tenant.create({
          data: {
            name,
            slug,
            schoolCode,
            phone: adminPhone,
            status,
          },
        });

        const schoolAdmin = await systemPrisma.user.upsert({
          where: { phone: adminPhone },
          update: { displayName: `${adminFirstName} ${adminLastName}` },
          create: {
            phone: adminPhone,
            displayName: `${adminFirstName} ${adminLastName}`,
          },
        });

        await systemPrisma.membership.create({
          data: {
            tenantId: tenant.id,
            userId: schoolAdmin.id,
            role: "SCHOOL_ADMIN",
            status: "ACTIVE",
          },
        });

        return reply.code(201).send({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          schoolCode: tenant.schoolCode,
          status: tenant.status,
          adminName: `${adminFirstName} ${adminLastName}`,
          adminPhone: adminPhone,
        });
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply.code(409).send({ error: "conflict", message: "School name or code already exists" });
        }
        throw error;
      }
    }
  );

  // Update tenant (app-level admin only)
  app.patch(
    "/admin/tenants/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const isAdmin = await isAppAdmin(request.currentUser.phone);
      if (!isAdmin) {
        return reply.code(403).send({ error: "forbidden", message: "Admin access required" });
      }

      const { id } = request.params as { id: string };
      const parsed = updateTenantSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      try {
        const tenant = await systemPrisma.tenant.update({
          where: { id },
          data: parsed.data,
          select: {
            id: true,
            name: true,
            slug: true,
            schoolCode: true,
            status: true,
          },
        });

        return reply.send(tenant);
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.code(404).send({ error: "not_found" });
        }
        throw error;
      }
    }
  );

  // Soft delete tenant (app-level admin only)
  app.delete(
    "/admin/tenants/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const isAdmin = await isAppAdmin(request.currentUser.phone);
      if (!isAdmin) {
        return reply.code(403).send({ error: "forbidden", message: "Admin access required" });
      }

      const { id } = request.params as { id: string };

      try {
        await systemPrisma.tenant.update({
          where: { id },
          data: { deletedAt: new Date() },
        });

        return reply.code(204).send();
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.code(404).send({ error: "not_found" });
        }
        throw error;
      }
    }
  );

  // Update school admin phone (app-level admin only)
  app.patch(
    "/admin/tenants/:id/admin-phone",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const isAdmin = await isAppAdmin(request.currentUser.phone);
      if (!isAdmin) {
        return reply.code(403).send({ error: "forbidden", message: "Admin access required" });
      }

      const { id } = request.params as { id: string };
      const parsed = updateAdminPhoneSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      const { adminPhone } = parsed.data;

      try {
        // Find the school admin for this tenant
        const membership = await systemPrisma.membership.findFirst({
          where: {
            tenantId: id,
            role: "SCHOOL_ADMIN",
          },
          include: { user: true },
        });

        if (!membership) {
          return reply.code(404).send({ error: "not_found", message: "School admin not found" });
        }

        // Check if new phone is already in use by another user
        const existingUser = await systemPrisma.user.findFirst({
          where: {
            phone: adminPhone,
            id: { not: membership.userId },
          },
        });

        if (existingUser) {
          return reply.code(409).send({ error: "conflict", message: "Phone number already in use" });
        }

        // Update the user's phone number
        const updatedUser = await systemPrisma.user.update({
          where: { id: membership.userId },
          data: { phone: adminPhone },
        });

        return reply.send({
          adminName: updatedUser.displayName,
          adminPhone: updatedUser.phone,
        });
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.code(404).send({ error: "not_found" });
        }
        throw error;
      }
    }
  );
}
