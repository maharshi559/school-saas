import type { FastifyInstance } from "fastify";
import { prisma as _prisma } from "@school/db";
import { z } from "zod";

// cast until SchoolEvent migration runs
const prisma = _prisma as any;

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  eventType: z.enum(["HOLIDAY", "EXAM", "EVENT", "CLOSURE", "MEETING", "OTHER"]),
  startDate: z.string().date(),
  endDate: z.string().date(),
  isAllDay: z.boolean().default(true),
});

export async function eventRoutes(app: FastifyInstance) {
  // List events (optionally filter by upcoming window)
  app.get(
    "/events",
    { preHandler: [app.authenticate, app.tenantScope()] },
    async (request, reply) => {
      const { from, to, type } = request.query as {
        from?: string;
        to?: string;
        type?: string;
      };

      const where: any = { deletedAt: null };
      if (from || to) {
        where.startDate = {};
        if (from) where.startDate.gte = new Date(from);
        if (to) where.startDate.lte = new Date(to);
      }
      if (type) where.eventType = type;

      const events = await prisma.schoolEvent.findMany({
        where,
        orderBy: { startDate: "asc" },
      });

      return reply.send({ items: events });
    }
  );

  // Create event
  app.post(
    "/events",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL"])] },
    async (request, reply) => {
      const data = eventSchema.parse(request.body);
      const event = await prisma.schoolEvent.create({
        data: {
          ...data,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          createdByUserId: request.currentUser!.id,
        },
      });
      return reply.code(201).send(event);
    }
  );

  // Update event
  app.patch(
    "/events/:id",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = eventSchema.partial().parse(request.body);

      try {
        const event = await prisma.schoolEvent.update({
          where: { id },
          data: {
            ...data,
            ...(data.startDate && { startDate: new Date(data.startDate) }),
            ...(data.endDate && { endDate: new Date(data.endDate) }),
          },
        });
        return reply.send(event);
      } catch (e: any) {
        if (e.code === "P2025") return reply.code(404).send({ error: "not_found" });
        throw e;
      }
    }
  );

  // Soft-delete event
  app.delete(
    "/events/:id",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        await prisma.schoolEvent.update({ where: { id }, data: { deletedAt: new Date() } });
        return reply.code(204).send();
      } catch (e: any) {
        if (e.code === "P2025") return reply.code(404).send({ error: "not_found" });
        throw e;
      }
    }
  );
}
