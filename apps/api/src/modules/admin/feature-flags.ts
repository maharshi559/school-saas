import type { FastifyInstance } from "fastify";
import { systemPrisma as _sp } from "@school/db";
import { z } from "zod";

// Cast until migration runs and Prisma client regenerates
const systemPrisma = _sp as any;

// Default feature flags seeded on first request
const DEFAULT_FLAGS = [
  { key: "ATTENDANCE",    description: "Attendance tracking module" },
  { key: "EXAM_SCORES",   description: "Exam scores and report cards" },
  { key: "FINANCE",       description: "Fees, payments and expenses" },
  { key: "COMMUNICATION", description: "Messaging and announcements" },
  { key: "CONSENT",       description: "DPDP consent management" },
  { key: "AI_INSIGHTS",   description: "AI-powered analytics and suggestions (coming soon)" },
];

/** Ensure all default global flags exist (idempotent). */
async function seedDefaultFlags() {
  for (const flag of DEFAULT_FLAGS) {
    await systemPrisma.featureFlag.upsert({
      where: { key_tenantId: { key: flag.key, tenantId: null as any } },
      create: { key: flag.key, description: flag.description, enabled: true, tenantId: null },
      update: {},
    });
  }
}

export async function featureFlagRoutes(app: FastifyInstance) {
  // ─── GET all flags (global + per-tenant) ──────────────────────────
  app.get(
    "/admin/feature-flags",
    { preHandler: [app.authenticate, app.requireAppRole(["APP_ADMIN", "APP_SUPPORT"])] },
    async (request, reply) => {
      await seedDefaultFlags();

      const { tenantId } = request.query as { tenantId?: string };

      const [globalFlags, tenantFlags] = await Promise.all([
        systemPrisma.featureFlag.findMany({
          where: { tenantId: null },
          orderBy: { key: "asc" },
        }),
        tenantId
          ? systemPrisma.featureFlag.findMany({
              where: { tenantId },
              orderBy: { key: "asc" },
            })
          : Promise.resolve([]),
      ]);

      // Merge: tenant override wins over global
      const merged = globalFlags.map((g: any) => {
        const override = tenantFlags.find((t: any) => t.key === g.key);
        return {
          key: g.key,
          description: g.description,
          globalEnabled: g.enabled,
          tenantEnabled: override?.enabled ?? null, // null = no override, inherits global
          effectiveEnabled: override?.enabled ?? g.enabled,
          tenantOverrideId: override?.id ?? null,
        };
      });

      return reply.send({ flags: merged });
    }
  );

  // ─── Toggle global flag ────────────────────────────────────────────
  app.patch(
    "/admin/feature-flags/:key",
    { preHandler: [app.authenticate, app.requireAppRole(["APP_ADMIN"])] },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      const { enabled } = z.object({ enabled: z.boolean() }).parse(request.body);

      const flag = await systemPrisma.featureFlag.upsert({
        where: { key_tenantId: { key, tenantId: null as any } },
        create: { key, enabled, tenantId: null, updatedByUserId: request.currentUser!.id },
        update: { enabled, updatedByUserId: request.currentUser!.id },
      });

      return reply.send(flag);
    }
  );

  // ─── Set tenant-specific override ─────────────────────────────────
  app.patch(
    "/admin/feature-flags/:key/tenant/:tenantId",
    { preHandler: [app.authenticate, app.requireAppRole(["APP_ADMIN"])] },
    async (request, reply) => {
      const { key, tenantId } = request.params as { key: string; tenantId: string };
      const body = z
        .object({ enabled: z.boolean().optional(), clearOverride: z.boolean().optional() })
        .parse(request.body);

      // Clear override → fall back to global
      if (body.clearOverride) {
        await systemPrisma.featureFlag.deleteMany({ where: { key, tenantId } });
        return reply.send({ cleared: true });
      }

      if (body.enabled === undefined) {
        return reply.code(400).send({ error: "enabled is required" });
      }

      const flag = await systemPrisma.featureFlag.upsert({
        where: { key_tenantId: { key, tenantId } },
        create: { key, enabled: body.enabled, tenantId, updatedByUserId: request.currentUser!.id },
        update: { enabled: body.enabled, updatedByUserId: request.currentUser!.id },
      });

      return reply.send(flag);
    }
  );
}

/** Runtime helper — call inside a route handler to check if a feature is on for a tenant. */
export async function isFeatureEnabled(key: string, tenantId?: string): Promise<boolean> {
  // Check tenant override first
  if (tenantId) {
    const tenantFlag = await systemPrisma.featureFlag.findUnique({
      where: { key_tenantId: { key, tenantId } },
    });
    if (tenantFlag !== null) return tenantFlag.enabled;
  }

  // Fall back to global
  const globalFlag = await systemPrisma.featureFlag.findUnique({
    where: { key_tenantId: { key, tenantId: null as any } },
  });

  // Default: enabled if no record exists
  return globalFlag?.enabled ?? true;
}
