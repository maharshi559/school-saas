/**
 * The three MVP roles. Deliberately flat — no per-permission RBAC yet.
 * See the school-management-saas skill: School Admin, Teacher, Parent.
 */
export const ROLES = ["SCHOOL_ADMIN", "TEACHER", "PARENT"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
