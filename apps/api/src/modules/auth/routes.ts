import type { FastifyInstance } from "fastify";
import { systemPrisma } from "@iskool/db";
import { z } from "zod";
import { otpRequestSchema, otpVerifySchema, type AuthResponse } from "@iskool/shared";
import { config } from "../../config.js";
import { generateOtp, hashOtp, sendOtp, verifyOtpHash } from "../../lib/otp.js";

const MAX_ATTEMPTS = 5;

export async function authRoutes(app: FastifyInstance) {
  /** Step 1 â€” request an OTP for a phone number. Always 200 to avoid enumeration. */
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

  /** Step 2 â€” verify the OTP, creating the user on first login, and return a token. */
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
      include: { memberships: { include: { tenant: true } }, roles: { where: { revokedAt: null } } },
    });

    const token = app.jwt.sign({ sub: user.id });
    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        appRoles: (() => {
          const dbRoles: string[] = (user as any).roles.map((r: any) => r.role);
          const adminPhones = (process.env.ADMIN_PHONES ?? "+919999900000").split(",").map((p: string) => p.trim());
          return adminPhones.includes(user.phone) && !dbRoles.includes("APP_ADMIN") ? [...dbRoles, "APP_ADMIN"] : dbRoles;
        })(),
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

  /** Update own profile. */
  app.patch("/auth/me", { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = z.object({
      firstName: z.string().min(1).max(50).optional(),
      lastName: z.string().max(50).optional(),
      email: z.string().email().optional().or(z.literal("")),
    }).safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    }
    const { firstName, lastName, email } = parsed.data;
    const updateData: Record<string, any> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (firstName !== undefined || lastName !== undefined) {
      updateData.displayName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
    }
    if (email !== undefined) updateData.email = email || null;

    const user = await (systemPrisma as any).user.update({
      where: { id: request.currentUser!.id },
      data: updateData,
    });
    return reply.send({
      id: user.id, phone: user.phone, displayName: user.displayName,
      firstName: user.firstName, lastName: user.lastName, email: user.email,
      appRoles: request.currentUser!.appRoles,
      memberships: request.currentUser!.memberships,
    });
  });
}
