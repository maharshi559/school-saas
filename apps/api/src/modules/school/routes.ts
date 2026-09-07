import type { FastifyInstance } from "fastify";
import { prisma } from "@school/db";
import { z } from "zod";

export async function schoolRoutes(app: FastifyInstance) {
  // ────────────────────── Classes ──────────────────────

  // Get all class levels
  app.get(
    "/class-levels",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const levels = await prisma.classLevel.findMany({
        where: { tenantId: request.tenant!.id },
        orderBy: { rank: "asc" },
      });
      return reply.send({ items: levels });
    }
  );

  // Create class level
  app.post(
    "/class-levels",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { name, rank } = z
        .object({
          name: z.string().min(1),
          rank: z.number().int().default(0),
        })
        .parse(request.body);

      const level = await prisma.classLevel.create({
        data: { name, rank, tenantId: request.tenant!.id },
      });

      return reply.code(201).send(level);
    }
  );

  // Get all academic years
  app.get(
    "/academic-years",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const years = await prisma.academicYear.findMany({
        where: { tenantId: request.tenant!.id },
        orderBy: { name: "desc" },
      });
      return reply.send({ items: years });
    }
  );

  // Create academic year
  app.post(
    "/academic-years",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { year, startDate, endDate } = z
        .object({
          year: z.string(),
          startDate: z.string().datetime(),
          endDate: z.string().datetime(),
        })
        .parse(request.body);

      const acy = await prisma.academicYear.create({
        data: {
          name: year,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          tenantId: request.tenant!.id,
        },
      });

      return reply.code(201).send(acy);
    }
  );

  // Create class section
  app.post(
    "/class-sections",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { classLevelId, academicYearId, name } = z
        .object({
          classLevelId: z.string(),
          academicYearId: z.string(),
          name: z.string().min(1),
        })
        .parse(request.body);

      const section = await prisma.classSection.create({
        data: {
          classLevelId,
          academicYearId,
          name,
          tenantId: request.tenant!.id,
        },
        include: { classLevel: true, academicYear: true },
      });

      return reply.code(201).send(section);
    }
  );

  // Update class section
  app.patch(
    "/class-sections/:id",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { name } = z.object({ name: z.string().min(1) }).parse(request.body);

      const section = await prisma.classSection.update({
        where: { id, tenantId: request.tenant!.id },
        data: { name },
        include: { classLevel: true, academicYear: true },
      });

      return reply.send(section);
    }
  );

  // ────────────────────── Teachers ──────────────────────

  // Get all teachers in school
  app.get(
    "/teachers",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const teachers = await prisma.user.findMany({
        where: {
          memberships: {
            some: {
              tenantId: request.tenant!.id,
              role: "TEACHER",
              status: "ACTIVE",
            },
          },
        },
        include: {
          memberships: {
            where: {
              tenantId: request.tenant!.id,
              role: "TEACHER",
            },
          },
        },
      });

      return reply.send({
        items: teachers.map((t) => ({
          id: t.id,
          phone: t.phone,
          displayName: t.displayName,
          memberships: t.memberships,
        })),
      });
    }
  );

  // Assign teacher to class section
  app.post(
    "/class-sections/:sectionId/assign-teacher",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { sectionId } = request.params as { sectionId: string };
      const { userId } = z.object({ userId: z.string() }).parse(request.body);

      const section = await prisma.classSection.update({
        where: { id: sectionId },
        data: { classTeacherId: userId },
        include: { classLevel: true, academicYear: true },
      });

      return reply.send(section);
    }
  );

  // ────────────────────── Students ──────────────────────

  // Get students by class section
  app.get(
    "/class-sections/:sectionId/students",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { sectionId } = request.params as { sectionId: string };

      const students = await prisma.student.findMany({
        where: {
          tenantId: request.tenant!.id,
          classSectionId: sectionId,
        },
        include: { classSection: true },
      });

      return reply.send({ items: students });
    }
  );

  // Assign student to class section
  app.patch(
    "/students/:studentId/assign-section",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      const { classSectionId } = z
        .object({ classSectionId: z.string() })
        .parse(request.body);

      const student = await prisma.student.update({
        where: { id: studentId },
        data: { classSectionId },
        include: { classSection: true },
      });

      return reply.send(student);
    }
  );
}
