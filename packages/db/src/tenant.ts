import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "@prisma/client";

/**
 * Non-negotiable rule from the project skill: every query against a tenant-scoped
 * table must be filtered by `tenantId`. We enforce that here instead of trusting
 * each call site to remember a `where: { tenantId }` clause.
 *
 * Usage:
 *   await runWithTenant(tenantId, () => prisma.student.findMany())
 *
 * Anything outside a `runWithTenant` scope may only touch GLOBAL_MODELS. Touching
 * a tenant-scoped model with no tenant in context throws — that is a bug, not a
 * silent full-table scan.
 */

/** Tables with no `tenantId` column. Everything else is tenant-scoped. */
export const GLOBAL_MODELS = new Set<string>(["User", "OtpChallenge", "Tenant"]);

type TenantContext = { tenantId: string };

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  if (!tenantId) throw new Error("runWithTenant called without a tenantId");
  return storage.run({ tenantId }, fn);
}

export function currentTenantId(): string | undefined {
  return storage.getStore()?.tenantId;
}

/**
 * Enter a tenant scope for the remainder of the current async context without
 * nesting a callback. Intended for web-framework request hooks (e.g. a Fastify
 * `onRequest` hook) where wrapping the whole handler chain in `runWithTenant`
 * is awkward. Prefer `runWithTenant` everywhere else.
 */
export function enterTenantContext(tenantId: string): void {
  if (!tenantId) throw new Error("enterTenantContext called without a tenantId");
  storage.enterWith({ tenantId });
}

function requireTenantId(model: string): string {
  const tenantId = currentTenantId();
  if (!tenantId) {
    throw new Error(
      `Query on tenant-scoped model "${model}" outside of a runWithTenant() scope. ` +
        `Wrap the call, or use the system client for platform-level work.`,
    );
  }
  return tenantId;
}

/**
 * Operations whose `args.where` should be narrowed by tenantId. `findUnique`(OrThrow)
 * is included: since Prisma 4.5 a `findUnique` where accepts extra non-unique
 * fields as post-lookup filters, so adding `tenantId` there is safe and means a
 * cross-tenant id lookup returns null instead of another school's row.
 */
const WHERE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

/**
 * Prisma client extension that injects the ambient tenantId into every operation
 * on a tenant-scoped model.
 */
export const tenantGuardExtension = Prisma.defineExtension({
  name: "tenant-guard",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || GLOBAL_MODELS.has(model)) {
          return query(args);
        }

        const tenantId = requireTenantId(model);
        const a: Record<string, unknown> = { ...(args as Record<string, unknown>) };

        if (operation === "create") {
          a.data = { ...(a.data as object), tenantId };
        } else if (operation === "createMany") {
          const data = a.data;
          a.data = Array.isArray(data)
            ? data.map((row) => ({ ...(row as object), tenantId }))
            : { ...(data as object), tenantId };
        } else if (operation === "upsert") {
          a.where = { ...(a.where as object), tenantId };
          a.create = { ...(a.create as object), tenantId };
        } else if (WHERE_OPS.has(operation)) {
          a.where = { ...(a.where as object), tenantId };
        }

        return query(a);
      },
    },
  },
});
