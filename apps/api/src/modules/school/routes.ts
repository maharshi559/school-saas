import type { FastifyInstance } from "fastify";
import { z } from "zod";

export async function schoolRoutes(app: FastifyInstance) {
  // ────────────────────── Classes ──────────────────────

  // Get all class levels
  app.get(
    "/class-levels",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const levels = await request.prisma.classLevel.findMany({
        where: { tenantId: request.currentTenant.id },
        orderBy: { order: "asc" },
      });
      return reply.send({ items: levels });
    }
  );

  // Create class level
  app.post(
    "/class-levels",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { name, abbreviation, order } = z
        .object({
          name: z.string().min(1),
          abbreviation: z.string().min(1),
          order: z.number().int().default(0),
        })
        .parse(request.body);

      const level = await request.prisma.classLevel.create({
        data: { name, abbreviation, order, tenantId: request.currentTenant.id },
      });

      return reply.code(201).send(level);
    }
  );

  // Get all academic years
  app.get(
    "/academic-years",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const years = await request.prisma.academicYear.findMany({
        where: { tenantId: request.currentTenant.id },
        orderBy: { year: "desc" },
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

      const acy = await request.prisma.academicYear.create({
        data: {
          year,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          tenantId: request.currentTenant.id,
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

      const section = await request.prisma.classSection.create({
        data: {
          classLevelId,
          academicYearId,
          name,
          tenantId: request.currentTenant.id,
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

      const section = await request.prisma.classSection.update({
        where: { id },
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
      const teachers = await request.prisma.user.findMany({
        where: {
          memberships: {
            some: {
              tenantId: request.currentTenant.id,
              role: "TEACHER",
              status: "ACTIVE",
            },
          },
        },
        include: {
          memberships: {
            where: {
              tenantId: request.currentTenant.id,
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

      const section = await request.prisma.classSection.update({
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

      const students = await request.prisma.student.findMany({
        where: {
          tenantId: request.currentTenant.id,
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

      const student = await request.prisma.student.update({
        where: { id: studentId },
        data: { classSectionId },
        include: { classSection: true },
      });

      return reply.send(student);
    }
  );
}
