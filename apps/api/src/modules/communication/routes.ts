import type { FastifyInstance } from "fastify";
import { prisma } from "@iskool/db";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name required"),
  type: z.enum(["UPDATE", "HOLIDAY", "CLOSURE", "ANNOUNCEMENT", "EMERGENCY", "OTHER"]),
  channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]),
  title: z.string().optional(),
  content: z.string().min(1, "Message content required"),
  recipientRole: z.enum(["PARENT", "TEACHER", "STUDENT", "ALL"]).default("PARENT"),
  description: z.string().optional(),
});

const sendMessageSchema = z.object({
  templateId: z.string().optional(),
  channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]),
  type: z.enum(["UPDATE", "HOLIDAY", "CLOSURE", "ANNOUNCEMENT", "EMERGENCY", "OTHER"]).optional(),
  recipientRole: z.enum(["PARENT", "TEACHER", "STUDENT", "ALL"]),
  title: z.string().optional(),
  content: z.string().min(1, "Message content required"),
  variables: z.record(z.string()).optional(),
  scheduleFor: z.string().datetime().optional(),
});

export async function communicationRoutes(app: FastifyInstance) {
  // Get all templates
  app.get(
    "/communication/templates",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const templates = await prisma.communicationTemplate.findMany({
        where: { deletedAt: null, isActive: true },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({ items: templates });
    }
  );

  // Create template
  app.post(
    "/communication/templates",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const parsed = createTemplateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      const template = await prisma.communicationTemplate.create({
        data: parsed.data,
      });

      return reply.code(201).send(template);
    }
  );

  // Update template
  app.patch(
    "/communication/templates/:id",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = createTemplateSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      try {
        const template = await prisma.communicationTemplate.update({
          where: { id },
          data: parsed.data,
        });
        return reply.send(template);
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.code(404).send({ error: "not_found" });
        }
        throw error;
      }
    }
  );

  // Delete template
  app.delete(
    "/communication/templates/:id",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        await prisma.communicationTemplate.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
        return reply.code(204).send();
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.code(404).send({ error: "not_found" });
        }
        throw error;
      }
    }
  );

  // Send message
  app.post(
    "/communication/send",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const parsed = sendMessageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      const { templateId, channel, recipientRole, title, content, variables, scheduleFor } = parsed.data;

      // Get template if provided
      const template = templateId
        ? await prisma.communicationTemplate.findUnique({ where: { id: templateId } })
        : null;

      // Replace template variables
      let finalContent = content;
      let finalTitle = title;

      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          const placeholder = `{{${key}}}`;
          finalContent = finalContent.replace(new RegExp(placeholder, "g"), String(value));
          if (finalTitle) {
            finalTitle = finalTitle.replace(new RegExp(placeholder, "g"), String(value));
          }
        });
      }

      // Count recipients based on role
      let recipientCount = 0;
      if (recipientRole === "PARENT") {
        const guardians = await prisma.guardian.findMany({
          where: { tenantId: request.tenant!.id, userId: { not: null } },
        });
        recipientCount = guardians.length;
      } else if (recipientRole === "TEACHER") {
        const teachers = await prisma.membership.findMany({
          where: { tenantId: request.tenant!.id, role: "TEACHER", status: "ACTIVE" },
        });
        recipientCount = teachers.length;
      } else if (recipientRole === "STUDENT") {
        const students = await prisma.student.findMany({
          where: { tenantId: request.tenant!.id, deletedAt: null },
        });
        recipientCount = students.length;
      } else if (recipientRole === "ALL") {
        const guardians = await prisma.guardian.findMany({
          where: { tenantId: request.tenant!.id, userId: { not: null } },
        });
        const teachers = await prisma.membership.findMany({
          where: { tenantId: request.tenant!.id, role: "TEACHER", status: "ACTIVE" },
        });
        const students = await prisma.student.findMany({
          where: { tenantId: request.tenant!.id, deletedAt: null },
        });
        recipientCount = guardians.length + teachers.length + students.length;
      }

      // Create communication log
      const log = await prisma.communicationLog.create({
        data: {
          templateId,
          channel,
          recipientRole,
          title: finalTitle,
          content: finalContent,
          recipientCount,
          status: scheduleFor ? "SCHEDULED" : "SENT",
          sentBy: request.currentUser?.id,
          sentAt: scheduleFor ? undefined : new Date(),
          metadata: JSON.stringify(variables || {}),
        },
      });

      // TODO: Integrate with WhatsApp API for actual sending
      // For now, this is logged but not actually sent
      // In production: call WhatsApp Business API

      return reply.code(201).send({
        id: log.id,
        channel,
        recipientRole,
        recipientCount,
        status: log.status,
        message: `Message logged for ${recipientCount} ${recipientRole.toLowerCase()} via ${channel}`,
      });
    }
  );

  // Get communication history
  app.get(
    "/communication/history",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { limit = "50", offset = "0", status, channel, type } = request.query as {
        limit?: string;
        offset?: string;
        status?: string;
        channel?: string;
        type?: string;
      };

      const where: any = {};
      if (status) where.status = status;
      if (channel) where.channel = channel;

      const logs = await prisma.communicationLog.findMany({
        where,
        include: { template: true },
        orderBy: { createdAt: "desc" },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      const total = await prisma.communicationLog.count({ where });

      return reply.send({
        items: logs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total,
        },
      });
    }
  );

  // Get message statistics
  app.get(
    "/communication/stats",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const logs = await prisma.communicationLog.findMany({
        where: {},
      });

      const stats = {
        total: logs.length,
        byStatus: {
          DRAFT: logs.filter((l) => l.status === "DRAFT").length,
          SCHEDULED: logs.filter((l) => l.status === "SCHEDULED").length,
          SENT: logs.filter((l) => l.status === "SENT").length,
          DELIVERED: logs.filter((l) => l.status === "DELIVERED").length,
          FAILED: logs.filter((l) => l.status === "FAILED").length,
        },
        byChannel: {
          WHATSAPP: logs.filter((l) => l.channel === "WHATSAPP").length,
          SMS: logs.filter((l) => l.channel === "SMS").length,
          EMAIL: logs.filter((l) => l.channel === "EMAIL").length,
        },
        byRole: {
          PARENT: logs.filter((l) => l.recipientRole === "PARENT").length,
          TEACHER: logs.filter((l) => l.recipientRole === "TEACHER").length,
          STUDENT: logs.filter((l) => l.recipientRole === "STUDENT").length,
          ALL: logs.filter((l) => l.recipientRole === "ALL").length,
        },
        totalRecipients: logs.reduce((sum, l) => sum + l.recipientCount, 0),
      };

      return reply.send(stats);
    }
  );
}
