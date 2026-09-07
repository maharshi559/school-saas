import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { config } from "../../config.js";

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
  // ── Attendance flags ────────────────────────────────────────────────────────
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

  // ── Fee reminder draft ──────────────────────────────────────────────────────
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

  // ── Exam insights ───────────────────────────────────────────────────────────
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

  // ── Communication draft ─────────────────────────────────────────────────────
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
}
