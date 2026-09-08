/**
 * Shared enums mirrored in the Prisma schema. Keep the string values identical
 * on both sides so API payloads round-trip without mapping.
 */

export const TENANT_STATUS = ["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"] as const;
export type TenantStatus = (typeof TENANT_STATUS)[number];

/** Teacher self-registers with a school code, then waits for admin approval. */
export const MEMBERSHIP_STATUS = ["PENDING_APPROVAL", "ACTIVE", "REJECTED", "DISABLED"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUS)[number];

export const ENROLLMENT_STATUS = ["ENROLLED", "INACTIVE", "GRADUATED", "TRANSFERRED"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUS)[number];

export const ATTENDANCE_STATUS = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

/**
 * DPDP Act: consent is captured per Parentâ€“Student pair, with separate scopes.
 * A single blanket checkbox is explicitly not sufficient.
 */
export const CONSENT_SCOPE = [
  "GENERAL_DATA_PROCESSING",
  "AI_PROCESSING",
  "CHANNEL_WHATSAPP",
  "CHANNEL_SMS",
] as const;
export type ConsentScope = (typeof CONSENT_SCOPE)[number];

export const NOTIFICATION_CHANNEL = ["SMS", "PUSH", "WHATSAPP"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[number];
