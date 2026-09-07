export { prisma, systemPrisma } from "./client.js";
export type { TenantPrisma } from "./client.js";
export { runWithTenant, enterTenantContext, currentTenantId, GLOBAL_MODELS } from "./tenant.js";
export { Prisma } from "@prisma/client";
export type {
  Tenant,
  User,
  Membership,
  Student,
  Guardian,
  GuardianStudent,
  ConsentRecord,
  AttendanceSession,
  AttendanceRecord,
  Role,
  TenantStatus,
  MembershipStatus,
  EnrollmentStatus,
  AttendanceStatus,
  ConsentScope,
} from "@prisma/client";
