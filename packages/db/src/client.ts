import { PrismaClient } from "@prisma/client";
import { tenantGuardExtension } from "./tenant.js";

const makeBase = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

/**
 * `systemPrisma` — unscoped. Use ONLY for platform-level work: tenant
 * provisioning, billing, super-admin, and auth lookups on global tables
 * (User / OtpChallenge). It will happily read across every school.
 */
const globalForPrisma = globalThis as unknown as { __systemPrisma?: PrismaClient };
export const systemPrisma: PrismaClient = globalForPrisma.__systemPrisma ?? makeBase();
if (process.env.NODE_ENV !== "production") globalForPrisma.__systemPrisma = systemPrisma;

/**
 * `prisma` — tenant-guarded. Every query on a tenant-scoped model is filtered by
 * the tenantId in the current `runWithTenant()` scope; calling one outside a
 * scope throws. This is what request handlers should use.
 */
export const prisma = systemPrisma.$extends(tenantGuardExtension);

export type TenantPrisma = typeof prisma;
