import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}:${config.JWT_SECRET}`).digest("hex");
}

export function verifyOtpHash(phone: string, code: string, hash: string): boolean {
  const expected = Buffer.from(hashOtp(phone, code));
  const actual = Buffer.from(hash);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Delivery adapter. Console in dev; swap in MSG91 for staging/prod. */
export async function sendOtp(phone: string, code: string, log: { info: (o: unknown, m?: string) => void }): Promise<void> {
  if (config.OTP_PROVIDER === "console") {
    log.info({ phone, code }, "OTP (console provider â€” not actually sent)");
    return;
  }
  // TODO: MSG91 flow API call using MSG91_AUTH_KEY / MSG91_OTP_TEMPLATE_ID.
  throw new Error(`OTP provider "${config.OTP_PROVIDER}" not implemented yet`);
}
