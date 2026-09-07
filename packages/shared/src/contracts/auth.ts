import { z } from "zod";
import { ROLES } from "../roles.js";

/** E.164 format: +CC followed by 6–15 digits. Accepts any country code.
    Bare digits (10+) normalized to +91 for backward compat, else +1 (US). */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => {
    // Already E.164: pass through
    if (/^\+\d{1,3}\d{6,14}$/.test(v)) return v;
    // Bare 10 digits: assume India (+91)
    if (/^[6-9]\d{9}$/.test(v)) return `+91${v}`;
    // Bare 10 digits: assume US (+1)
    if (/^\d{10}$/.test(v)) return `+1${v}`;
    // Otherwise fail
    throw new Error("Invalid phone number");
  })
  .refine((v) => /^\+\d{1,3}\d{6,14}$/.test(v), "Enter a valid phone number (E.164 or 10 digits)");

export const otpRequestSchema = z.object({
  phone: phoneSchema,
});
export type OtpRequest = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{4,6}$/, "OTP must be 4–6 digits"),
});
export type OtpVerify = z.infer<typeof otpVerifySchema>;

export const sessionUserSchema = z.object({
  id: z.string(),
  phone: z.string(),
  displayName: z.string().nullable(),
  memberships: z.array(
    z.object({
      tenantId: z.string(),
      tenantName: z.string(),
      role: z.enum(ROLES),
      status: z.string(),
    }),
  ),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const authResponseSchema = z.object({
  token: z.string(),
  user: sessionUserSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
