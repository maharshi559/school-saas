import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { systemPrisma, enterTenantContext, type Role } from "@school/db";
import { config } from "../config.js";

export type RequestUser = {
  id: string;
  phone: string;
  displayName: string | null;
  memberships: { tenantId: string; tenantName: string; role: Role; status: string }[];
};

declare module "fastify" {
  interface FastifyInstance {
    /** preHandler: require a valid session token; populates `request.currentUser`. */
    authenticate: preHandlerHookHandler;
    /**
     * preHandler factory: require an ACTIVE membership in the tenant named by the
     * `x-tenant-id` header, optionally restricted to `roles`. Enters the tenant
     * scope so `@school/db`'s `prisma` is filtered for the rest of the request.
     */
    tenantScope: (roles?: Role[]) => preHandlerHookHandler;
    /**
     * preHandler factory: require the caller to hold one of the given app-level
     * roles (APP_ADMIN, APP_SUPPORT). No tenant context needed.
     */
    requireAppRole: (roles: ("APP_ADMIN" | "APP_SUPPORT")[]) => preHandlerHookHandler;
  }
  interface FastifyRequest {
    currentUser?: RequestUser;
    tenant?: { id: string; role: Role };
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

async function loadUser(userId: string): Promise<RequestUser | null> {
  const user = await systemPrisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { tenant: true } } },
  });
  if (!user) return null;
  return {
    id: user.id,
    phone: user.phone,
    displayName: user.displayName,
    memberships: user.memberships.map((m) => ({
      tenantId: m.tenantId,
      tenantName: m.tenant.name,
      role: m.role,
      status: m.status,
    })),
  };
}

export const authPlugin = fp(
  async (app) => {
    await app.register(fastifyJwt, {
      secret: config.JWT_SECRET,
      sign: { expiresIn: config.JWT_EXPIRES_IN },
    });

    app.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: "unauthorized", message: "Invalid or missing token" });
      }
      const user = await loadUser(request.user.sub);
      if (!user) {
        return reply.code(401).send({ error: "unauthorized", message: "User no longer exists" });
      }
      request.currentUser = user;
    });

    app.decorate("tenantScope", function (roles?: Role[]) {
      return async function (request: FastifyRequest, reply: FastifyReply) {
        if (!request.currentUser) {
          return reply.code(401).send({ error: "unauthorized" });
        }
        const tenantId = request.headers["x-tenant-id"];
        if (typeof tenantId !== "string" || !tenantId) {
          return reply.code(400).send({ error: "tenant_required", message: "Missing x-tenant-id header" });
        }
        const membership = request.currentUser.memberships.find(
          (m) => m.tenantId === tenantId && m.status === "ACTIVE",
        );
        if (!membership) {
          return reply.code(403).send({ error: "forbidden", message: "No active membership in this school" });
        }
        if (roles && !roles.includes(membership.role)) {
          return reply.code(403).send({ error: "forbidden", message: "Insufficient role" });
        }
        request.tenant = { id: tenantId, role: membership.role };
        enterTenantContext(tenantId);
      };
    });

    app.decorate("requireAppRole", function (roles: ("APP_ADMIN" | "APP_SUPPORT")[]) {
      return async function (request: FastifyRequest, reply: FastifyReply) {
        if (!request.currentUser) {
          return reply.code(401).send({ error: "unauthorized" });
        }
        const userRoles = await systemPrisma.userRole.findMany({
          where: { userId: request.currentUser.id, revokedAt: null },
          select: { role: true },
        });
        const hasRole = userRoles.some((r) => roles.includes(r.role as any));
        if (!hasRole) {
          return reply.code(403).send({ error: "forbidden", message: "App-level role required" });
        }
      };
    });
  },
  { name: "auth" },
);
