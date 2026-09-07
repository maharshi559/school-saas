import type { FastifyInstance } from "fastify";
import { systemPrisma } from "@school/db";
import { otpRequestSchema, otpVerifySchema, type AuthResponse } from "@school/shared";
import { config } from "../../config.js";
import { generateOtp, hashOtp, sendOtp, verifyOtpHash } from "../../lib/otp.js";

const MAX_ATTEMPTS = 5;

export async function authRoutes(app: FastifyInstance) {
  /** Step 1 — request an OTP for a phone number. Always 200 to avoid enumeration. */
  app.post("/auth/otp/request", async (request, reply) => {
    const parsed = otpRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    const { phone } = parsed.data;
    const code = generateOtp();

    await systemPrisma.otpChallenge.create({
      data: {
        phone,
        codeHash: hashOtp(phone, code),
        expiresAt: new Date(Date.now() + config.OTP_TTL_SECONDS * 1000),
      },
    });
    await sendOtp(phone, code, request.log);

    return { ok: true, ttlSeconds: config.OTP_TTL_SECONDS };
  });

  /** Step 2 — verify the OTP, creating the user on first login, and return a token. */
  app.post("/auth/otp/verify", async (request, reply): Promise<AuthResponse | void> => {
    const parsed = otpVerifySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }
    const { phone, code } = parsed.data;

    const challenge = await systemPrisma.otpChallenge.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge || challenge.attempts >= MAX_ATTEMPTS) {
      return reply.code(400).send({ error: "otp_invalid", message: "Request a new code" });
    }
    if (!verifyOtpHash(phone, code, challenge.codeHash)) {
      await systemPrisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      return reply.code(400).send({ error: "otp_invalid", message: "Incorrect code" });
    }

    await systemPrisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    const user = await systemPrisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
      include: { memberships: { include: { tenant: true } } },
    });

    const token = app.jwt.sign({ sub: user.id });
    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        memberships: user.memberships.map((m) => ({
          tenantId: m.tenantId,
          tenantName: m.tenant.name,
          role: m.role as any,
          status: m.status,
        })),
      },
    };
  });

  /** Current session. */
  app.get("/auth/me", { preHandler: app.authenticate }, async (request) => {
    return { user: request.currentUser };
  });
}
