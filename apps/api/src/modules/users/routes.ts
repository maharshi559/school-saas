import type { FastifyInstance } from "fastify";
import { prisma, systemPrisma } from "@school/db";
import { z } from "zod";
import { randomBytes } from "crypto";

export async function userRoutes(app: FastifyInstance) {
  // ────────────────────── User Invites ──────────────────────

  // Create user invite (School admin only)
  app.post(
    "/invites",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { phone } = z.object({ phone: z.string() }).parse(request.body);

      const tenantId = request.tenant!.id;

      // Check if user already exists in the school
      const existingMembership = await prisma.membership.findFirst({
        where: { tenantId, user: { phone } },
      });

      if (existingMembership) {
        return reply.code(400).send({ error: "User already exists in this school" });
      }

      // Check if invite already exists
      const existingInvite = await prisma.userInvite.findFirst({
        where: { tenantId, phone, status: { in: ["PENDING", "ACCEPTED"] } },
      });

      if (existingInvite) {
        return reply.code(400).send({ error: "Invite already exists for this phone number" });
      }

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const [invite, tenant] = await Promise.all([
        prisma.userInvite.create({
          data: { tenantId, phone, token, createdBy: request.currentUser!.id, expiresAt },
        }),
        systemPrisma.tenant.findUnique({ where: { id: tenantId }, select: { schoolCode: true } }),
      ]);

      return reply.code(201).send({
        id: invite.id,
        phone: invite.phone,
        inviteLink: `${process.env.VITE_APP_URL || "http://localhost:5173"}/register?token=${token}&schoolCode=${tenant?.schoolCode}`,
      });
    }
  );

  // Get all pending users (School admin)
  app.get(
    "/pending-members",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const memberships = await prisma.membership.findMany({
        where: {
          tenantId: request.tenant!.id,
          status: "PENDING_APPROVAL",
        },
        include: {
          user: {
            select: { id: true, phone: true, displayName: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({
        items: memberships.map((m) => ({
          id: m.id,
          userId: m.user.id,
          phone: m.user.phone,
          displayName: m.user.displayName,
          joinedAt: m.createdAt,
          requestedRole: m.role,
        })),
      });
    }
  );

  // Approve user and assign role (School admin)
  app.post(
    "/members/:memberId/approve",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { memberId } = request.params as { memberId: string };
      const { role } = z.object({ role: z.string() }).parse(request.body);

      const membership = await prisma.membership.findUnique({
        where: { id: memberId },
      });

      if (!membership || membership.tenantId !== request.tenant!.id) {
        return reply.code(404).send({ error: "Member not found" });
      }

      const updated = await prisma.membership.update({
        where: { id: memberId },
        data: {
          status: "ACTIVE",
          role: role as any,
          approvedByUserId: request.currentUser!.id,
        },
      });

      return reply.send(updated);
    }
  );

  // Reject/Revoke membership (School admin)
  app.post(
    "/members/:memberId/reject",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { memberId } = request.params as { memberId: string };

      const membership = await prisma.membership.findUnique({
        where: { id: memberId },
      });

      if (!membership || membership.tenantId !== request.tenant!.id) {
        return reply.code(404).send({ error: "Member not found" });
      }

      const updated = await prisma.membership.update({
        where: { id: memberId },
        data: { status: "REJECTED" },
      });

      return reply.send(updated);
    }
  );

  // Register new user via invite token (public - no auth required)
  app.post(
    "/auth/register",
    async (request, reply) => {
      const { token, phone, displayName, schoolCode } = z
        .object({
          token: z.string(),
          phone: z.string(),
          displayName: z.string().optional(),
          schoolCode: z.string(),
        })
        .parse(request.body);

      // Validate invite
      const invite = await prisma.userInvite.findUnique({
        where: { token },
        include: { tenant: true },
      });

      if (!invite) {
        return reply.code(400).send({ error: "Invalid or expired invite" });
      }

      if (invite.status !== "PENDING") {
        return reply.code(400).send({ error: "Invite has already been used or revoked" });
      }

      if (invite.expiresAt < new Date()) {
        return reply.code(400).send({ error: "Invite has expired" });
      }

      if (invite.tenant.schoolCode !== schoolCode) {
        return reply.code(400).send({ error: "Invalid school code" });
      }

      if (invite.phone !== phone) {
        return reply.code(400).send({ error: "Phone number does not match invite" });
      }

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { phone },
      });

      // Create user if doesn't exist
      if (!user) {
        user = await prisma.user.create({
          data: {
            phone,
            displayName: displayName || phone,
          },
        });
      } else if (displayName && !user.displayName) {
        // Update display name if provided and empty
        user = await prisma.user.update({
          where: { id: user.id },
          data: { displayName },
        });
      }

      // Create membership with PENDING_APPROVAL status (admin needs to approve)
      const membership = await prisma.membership.create({
        data: {
          tenantId: invite.tenantId,
          userId: user.id,
          role: "STAFF", // Default role - admin will assign actual role
          status: "PENDING_APPROVAL",
        },
      });

      // Mark invite as accepted
      await prisma.userInvite.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      return reply.code(201).send({
        user: {
          id: user.id,
          phone: user.phone,
          displayName: user.displayName,
        },
        membership: {
          id: membership.id,
          status: membership.status,
          message: "Registration successful! Awaiting admin approval.",
        },
      });
    }
  );

  // Validate invite token (public - for UI)
  app.get(
    "/invites/:token/validate",
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const { schoolCode } = request.query as { schoolCode: string };

      const invite = await prisma.userInvite.findUnique({
        where: { token },
        include: { tenant: { select: { name: true, schoolCode: true } } },
      });

      if (!invite) {
        return reply.code(400).send({ error: "Invalid invite" });
      }

      if (invite.status !== "PENDING") {
        return reply.code(400).send({ error: "Invite has already been used" });
      }

      if (invite.expiresAt < new Date()) {
        return reply.code(400).send({ error: "Invite has expired" });
      }

      if (invite.tenant.schoolCode !== schoolCode) {
        return reply.code(400).send({ error: "Invalid school code" });
      }

      return reply.send({
        valid: true,
        schoolName: invite.tenant.name,
        schoolCode: invite.tenant.schoolCode,
        phone: invite.phone,
      });
    }
  );
}
