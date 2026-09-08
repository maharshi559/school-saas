import type { FastifyInstance } from "fastify";
import { prisma } from "@iskool/db";
import { z } from "zod";

import { config } from "../../config.js";
import { createNotification } from "../notifications/routes.js";

const AI_BASE = config.AI_SERVICE_URL;
const SERVICE_KEY = config.AI_SERVICE_KEY;

async function callAI(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${AI_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": SERVICE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI service error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function aiProxyRoutes(app: FastifyInstance) {
  // â”€â”€ Attendance flags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.get(
    "/ai/attendance/flags",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"])] },
    async (request, reply) => {
      const { thresholdDays = "14", thresholdPct = "40" } = request.query as Record<string, string>;
      const data = await callAI("/ai/attendance/flags", {
        tenantId: request.tenant!.id,
        thresholdDays: parseInt(thresholdDays),
        thresholdPct: parseFloat(thresholdPct),
      });
      return reply.send(data);
    }
  );

  // â”€â”€ Fee reminder draft â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.post(
    "/ai/finance/draft-reminder",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL"])] },
    async (request, reply) => {
      const { channel, studentIds } = z
        .object({
          channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]).default("WHATSAPP"),
          studentIds: z.array(z.string()).optional(),
        })
        .parse(request.body);
      const data = await callAI("/ai/finance/draft-reminder", {
        tenantId: request.tenant!.id,
        channel,
        studentIds,
      });
      return reply.send(data);
    }
  );

  // â”€â”€ Exam insights â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.post(
    "/ai/exam/insights",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"])] },
    async (request, reply) => {
      const { classSectionId, examName, subject } = z
        .object({
          classSectionId: z.string(),
          examName: z.string().optional(),
          subject: z.string().optional(),
        })
        .parse(request.body);
      const data = await callAI("/ai/exam/insights", {
        tenantId: request.tenant!.id,
        classSectionId,
        examName,
        subject,
      });
      return reply.send(data);
    }
  );

  // â”€â”€ Communication draft â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.post(
    "/ai/communication/draft",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"])] },
    async (request, reply) => {
      const { brief, channel, recipientRole } = z
        .object({
          brief: z.string().min(5).max(500),
          channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]),
          recipientRole: z.enum(["PARENT", "TEACHER", "STUDENT", "ALL"]).default("PARENT"),
        })
        .parse(request.body);
      const data = await callAI("/ai/communication/draft", {
        tenantId: request.tenant!.id,
        brief,
        channel,
        recipientRole,
      });
      return reply.send(data);
    }
  );

  // â”€â”€ AI communication suggestions based on upcoming events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // GET /ai/communication/suggestions?days=30
  // Queries upcoming school events, sends to AI, gets back ready-to-use drafts.
  // Also pushes an in-app notification to the requesting admin.
  app.get(
    "/ai/communication/suggestions",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL"])] },
    async (request, reply) => {
      const { days = "30", channel = "WHATSAPP" } = request.query as Record<string, string>;
      const tenantId = request.tenant!.id;

      const until = new Date();
      until.setDate(until.getDate() + parseInt(days));

      const events = await (prisma as any).schoolEvent.findMany({
        where: {
          tenantId,
          deletedAt: null,
          startDate: { gte: new Date(), lte: until },
        },
        orderBy: { startDate: "asc" },
        take: 20,
      });

      if (events.length === 0) {
        return reply.send({ suggestions: [], message: "No upcoming events in the next " + days + " days." });
      }

      const data = await callAI("/ai/communication/suggest", {
        tenantId,
        events: events.map((e: any) => ({
          title: e.title,
          eventType: e.eventType,
          startDate: e.startDate,
          endDate: e.endDate,
          description: e.description,
        })),
        channel,
      }) as { suggestions: any[] };

      // Push a notification to the requesting admin so they see it in the bell
      await createNotification({
        tenantId,
        userId: request.currentUser!.id,
        type: "AI_SUGGESTION",
        title: "AI communication suggestions ready",
        body: `${data.suggestions?.length ?? 0} notification draft(s) suggested based on upcoming events.`,
        data: { suggestionCount: data.suggestions?.length ?? 0 },
      });

      return reply.send(data);
    }
  );
}
