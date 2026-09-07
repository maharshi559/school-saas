import type { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "@school/db";

// In-memory SSE connections: userId → Set of response objects
// ponytail: single-instance map; swap for Redis pub/sub when scaling horizontally
const connections = new Map<string, Set<any>>();

/** Push a notification to a connected user immediately (call from other routes). */
export function pushToUser(userId: string, payload: object) {
  const sinks = connections.get(userId);
  if (!sinks) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of sinks) {
    try { res.write(data); } catch { /* client disconnected */ }
  }
}

/** Create a notification row and push it live if user is connected. */
export async function createNotification(params: {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: object;
}) {
  const db = prisma as any; // cast until migration runs
  const notif = await db.notification.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ? JSON.stringify(params.data) : null,
    },
  });
  pushToUser(params.userId, notif);
  return notif;
}

export async function notificationRoutes(app: FastifyInstance) {
  // ── SSE stream ──────────────────────────────────────────────────────────────
  app.get(
    "/notifications/stream",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply) => {
      const userId = request.currentUser!.id;

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");
      reply.raw.flushHeaders();

      // Register this connection
      if (!connections.has(userId)) connections.set(userId, new Set());
      connections.get(userId)!.add(reply.raw);

      // Heartbeat every 30s to keep proxy connections alive
      const heartbeat = setInterval(() => {
        try { reply.raw.write(":\n\n"); } catch { clearInterval(heartbeat); }
      }, 30_000);

      // Send unread notifications immediately on connect
      const db = prisma as any;
      const unread = await db.notification.findMany({
        where: { userId, readAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      for (const n of unread) {
        reply.raw.write(`data: ${JSON.stringify(n)}\n\n`);
      }

      request.raw.on("close", () => {
        clearInterval(heartbeat);
        connections.get(userId)?.delete(reply.raw);
        if (connections.get(userId)?.size === 0) connections.delete(userId);
      });

      // Keep the handler open — never resolve
      await new Promise(() => {});
    }
  );

  // ── List notifications (paginated) ─────────────────────────────────────────
  app.get(
    "/notifications",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { unreadOnly = "false", limit = "30" } = request.query as Record<string, string>;
      const db = prisma as any;

      const where: any = { userId: request.currentUser!.id };
      if (unreadOnly === "true") where.readAt = null;

      const [items, unreadCount] = await Promise.all([
        db.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: parseInt(limit),
        }),
        db.notification.count({ where: { userId: request.currentUser!.id, readAt: null } }),
      ]);

      return reply.send({ items, unreadCount });
    }
  );

  // ── Mark one as read ────────────────────────────────────────────────────────
  app.patch(
    "/notifications/:id/read",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = prisma as any;
      await db.notification.updateMany({
        where: { id, userId: request.currentUser!.id },
        data: { readAt: new Date() },
      });
      return reply.code(204).send();
    }
  );

  // ── Mark all as read ────────────────────────────────────────────────────────
  app.patch(
    "/notifications/read-all",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const db = prisma as any;
      await db.notification.updateMany({
        where: { userId: request.currentUser!.id, readAt: null },
        data: { readAt: new Date() },
      });
      return reply.code(204).send();
    }
  );
}
