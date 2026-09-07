import type { FastifyInstance } from "fastify";
import { systemPrisma } from "@school/db";
import { z } from "zod";

const ADMIN_PHONES = process.env.ADMIN_PHONES?.split(",") || ["+919999900000"];

const grantRoleSchema = z.object({
  phone: z.string().min(10, "Phone number required"),
  role: z.enum(["APP_ADMIN", "APP_SUPPORT"]),
});

const revokeRoleSchema = z.object({
  phone: z.string().min(10, "Phone number required"),
  role: z.enum(["APP_ADMIN", "APP_SUPPORT"]),
});

const grantTenantRoleSchema = z.object({
  phone: z.string().min(10, "Phone number required"),
  role: z.enum(["SCHOOL_ADMIN", "PRINCIPAL", "FINANCE_MANAGER", "ACCOUNTANT", "TEACHER", "PARENT", "STAFF"]),
  tenantId: z.string(),
  status: z.enum(["PENDING_APPROVAL", "ACTIVE", "REJECTED", "DISABLED"]).default("ACTIVE"),
});

async function isAppAdmin(phone: string): Promise<boolean> {
  return ADMIN_PHONES.includes(phone);
}

export async function roleRoutes(app: FastifyInstance) {
  // Get all app-level roles for a user
  app.get(
    "/admin/users/:phone/roles",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const isAdmin = await isAppAdmin(request.currentUser.phone);
      if (!isAdmin) {
        return reply.code(403).send({ error: "forbidden", message: "Admin access required" });
      }

      const { phone } = request.params as { phone: string };

      const user = await systemPrisma.user.findUnique({
        where: { phone },
        include: {
          roles: {
            where: { revokedAt: null },
            select: { role: true, grantedAt: true, grantedBy: true },
          },
          memberships: {
            where: { status: "ACTIVE" },
            select: { role: true, tenantId: true },
          },
        },
      });

      if (!user) {
        return reply.code(404).send({ error: "user_not_found" });
      }

      return reply.send({
        phone: user.phone,
        displayName: user.displayName,
        appRoles: user.roles,
        tenantRoles: user.memberships,
      });
    }
  );

  // Grant app-level role to user
  app.post(
    "/admin/users/roles/grant",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const isAdmin = await isAppAdmin(request.currentUser.phone);
      if (!isAdmin) {
        return reply.code(403).send({ error: "forbidden", message: "Admin access required" });
      }

      const parsed = grantRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      const { phone, role } = parsed.data;

      try {
        // Find or create user
        const user = await systemPrisma.user.findUnique({ where: { phone } });

        if (!user) {
          return reply.code(404).send({ error: "user_not_found" });
        }

        // Grant role
        const userRole = await systemPrisma.userRole.upsert({
          where: { userId_role: { userId: user.id, role } },
          update: { revokedAt: null },
          create: {
            userId: user.id,
            role,
            grantedBy: request.currentUser.id,
          },
        });

        return reply.code(201).send({
          phone,
          role,
          grantedAt: userRole.grantedAt,
          message: `Role ${role} granted to ${phone}`,
        });
      } catch (error: any) {
        throw error;
      }
    }
  );

  // Revoke app-level role from user
  app.post(
    "/admin/users/roles/revoke",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const isAdmin = await isAppAdmin(request.currentUser.phone);
      if (!isAdmin) {
        return reply.code(403).send({ error: "forbidden", message: "Admin access required" });
      }

      const parsed = revokeRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      const { phone, role } = parsed.data;

      try {
        const user = await systemPrisma.user.findUnique({ where: { phone } });

        if (!user) {
          return reply.code(404).send({ error: "user_not_found" });
        }

        // Soft-delete role
        await systemPrisma.userRole.update({
          where: { userId_role: { userId: user.id, role } },
          data: { revokedAt: new Date() },
        });

        return reply.code(200).send({
          phone,
          role,
          message: `Role ${role} revoked from ${phone}`,
        });
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.code(404).send({ error: "role_not_found" });
        }
        throw error;
      }
    }
  );

  // Grant tenant-level role to user (app admin only)
  app.post(
    "/admin/users/tenant-roles/grant",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const isAdmin = await isAppAdmin(request.currentUser.phone);
      if (!isAdmin) {
        return reply.code(403).send({ error: "forbidden", message: "Admin access required" });
      }

      const parsed = grantTenantRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      const { phone, role, tenantId, status } = parsed.data;

      try {
        // Find or create user
        let user = await systemPrisma.user.findUnique({ where: { phone } });

        if (!user) {
          user = await systemPrisma.user.create({
            data: { phone, displayName: `User ${phone}` },
          });
        }

        // Grant membership/role
        const membership = await systemPrisma.membership.upsert({
          where: {
            tenantId_userId_role: {
              tenantId,
              userId: user.id,
              role,
            },
          },
          update: { status },
          create: {
            tenantId,
            userId: user.id,
            role,
            status,
          },
        });

        return reply.code(201).send({
          phone,
          tenantId,
          role,
          status: membership.status,
          message: `Role ${role} granted to ${phone} in tenant ${tenantId}`,
        });
      } catch (error: any) {
        throw error;
      }
    }
  );

  // List all users with app-level roles
  app.get(
    "/admin/users/with-roles",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const isAdmin = await isAppAdmin(request.currentUser.phone);
      if (!isAdmin) {
        return reply.code(403).send({ error: "forbidden", message: "Admin access required" });
      }

      const users = await systemPrisma.user.findMany({
        where: {
          roles: {
            some: { revokedAt: null },
          },
        },
        include: {
          roles: {
            where: { revokedAt: null },
            select: { role: true, grantedAt: true },
          },
        },
      });

      return reply.send({ items: users });
    }
  );
}
