import type { FastifyInstance } from "fastify";
import { prisma } from "@iskool/db";
import { createStudentSchema, listQuerySchema } from "@iskool/shared";
import { z } from "zod";

const updateStudentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().nullable().optional(),
  classSectionId: z.string().nullable().optional(),
  enrollmentStatus: z.enum(["ENROLLED", "INACTIVE", "GRADUATED", "TRANSFERRED"]).optional(),
});

/**
 * Every handler here runs inside a tenant scope established by `tenantScope()`,
 * so `prisma.student.*` is automatically filtered to the caller's school â€” there
 * is deliberately no `where: { tenantId }` written by hand.
 */
export async function studentRoutes(app: FastifyInstance) {
  app.get(
    "/students",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "TEACHER"])] },
    async (request, reply) => {
      const parsed = listQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_query", details: parsed.error.flatten() });
      }
      const { cursor, limit, q } = parsed.data;

      const rows = await prisma.student.findMany({
        where: {
          deletedAt: null,
          ...(q
            ? {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { admissionNo: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: { classSection: { select: { name: true, classLevel: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      };
    },
  );

  app.post(
    "/students",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const parsed = createStudentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_request", details: parsed.error.flatten() });
      }
      const { firstName, lastName, admissionNo, dateOfBirth, classSectionId } = parsed.data;

      const existing = await prisma.student.findFirst({ where: { admissionNo, deletedAt: null } });
      if (existing) {
        return reply.code(409).send({ error: "duplicate_admission_no" });
      }

      const student = await prisma.student.create({
        data: {
          firstName,
          lastName,
          admissionNo,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          classSectionId: classSectionId ?? null,
        },
        include: { classSection: { select: { name: true, classLevel: { select: { name: true } } } } },
      });
      return reply.code(201).send(student);
    },
  );

  app.patch(
    "/students/:id",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateStudentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_request", details: parsed.error.flatten() });
      }

      const updateData: Record<string, any> = {};
      if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName;
      if (parsed.data.lastName !== undefined) updateData.lastName = parsed.data.lastName;
      if (parsed.data.dateOfBirth !== undefined) {
        updateData.dateOfBirth = parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null;
      }
      if (parsed.data.classSectionId !== undefined) updateData.classSectionId = parsed.data.classSectionId;
      if (parsed.data.enrollmentStatus !== undefined) updateData.enrollmentStatus = parsed.data.enrollmentStatus;

      try {
        const student = await prisma.student.update({
          where: { id },
          data: updateData,
          include: { classSection: { select: { name: true, classLevel: { select: { name: true } } } } },
        });
        return reply.send(student);
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.code(404).send({ error: "not_found" });
        }
        throw error;
      }
    },
  );

  app.delete(
    "/students/:id",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        await prisma.student.update({
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
    },
  );
}
