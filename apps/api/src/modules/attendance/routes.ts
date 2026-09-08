import type { FastifyInstance } from "fastify";
import { prisma, systemPrisma } from "@iskool/db";
import { z } from "zod";

const createAttendanceSchema = z.object({
  classSectionId: z.string().min(1, "Class section is required"),
  date: z.string().date("Invalid date format (YYYY-MM-DD)"),
  records: z
    .array(
      z.object({
        studentId: z.string(),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
        clientRecordId: z.string().optional(),
      })
    )
    .min(1, "At least one attendance record required"),
});

const getAttendanceSchema = z.object({
  classSectionId: z.string().optional(),
  date: z.string().date().optional(),
});

export async function attendanceRoutes(app: FastifyInstance) {
  // Get class sections for the school
  app.get(
    "/class-sections",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "TEACHER"])] },
    async (request, reply) => {
      const sections = await prisma.classSection.findMany({
        include: {
          classLevel: { select: { name: true } },
          _count: { select: { students: true } },
        },
        orderBy: [{ classLevel: { rank: "asc" } }, { name: "asc" }],
      });

      return reply.send({ items: sections });
    }
  );

  // Get students in a class section for attendance marking
  app.get(
    "/class-sections/:sectionId/students-for-attendance",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "TEACHER"])] },
    async (request, reply) => {
      const { sectionId } = request.params as { sectionId: string };

      const students = await prisma.student.findMany({
        where: {
          classSectionId: sectionId,
          deletedAt: null,
          enrollmentStatus: "ENROLLED",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNo: true,
        },
        orderBy: { firstName: "asc" },
      });

      return reply.send({ items: students });
    }
  );

  // Get today's attendance session (or create one)
  app.get(
    "/attendance-session",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "TEACHER"])] },
    async (request, reply) => {
      const { classSectionId, date } = getAttendanceSchema.parse(request.query);

      if (!classSectionId) {
        return reply.code(400).send({ error: "classSectionId is required" });
      }

      const attendanceDate = date ? new Date(date) : new Date();
      attendanceDate.setHours(0, 0, 0, 0);

      let session = await prisma.attendanceSession.findFirst({
        where: {
          classSectionId,
          date: attendanceDate,
        },
        include: {
          records: { select: { studentId: true, status: true, clientRecordId: true } },
        },
      });

      // For today, auto-create session if it doesn't exist
      if (!session && date === undefined) {
        session = await prisma.attendanceSession.create({
          data: {
            classSectionId,
            date: attendanceDate,
            takenByUserId: request.currentUser!.id,
            source: "WEB",
          },
          include: {
            records: { select: { studentId: true, status: true, clientRecordId: true } },
          },
        });
      }

      return reply.send(session || { id: null, records: [] });
    }
  );

  // Submit attendance records (batch create/update)
  app.post(
    "/attendance",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "TEACHER"])] },
    async (request, reply) => {
      const parsed = createAttendanceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      const { classSectionId, date, records } = parsed.data;
      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      try {
        // Find or create session
        let session = await prisma.attendanceSession.findFirst({
          where: { classSectionId, date: attendanceDate },
        });

        if (!session) {
          session = await prisma.attendanceSession.create({
            data: {
              classSectionId,
              date: attendanceDate,
              takenByUserId: request.currentUser!.id,
              source: "WEB",
            },
          });
        }

        // Upsert attendance records (idempotent via clientRecordId)
        const createdRecords = await Promise.all(
          records.map((r) =>
            prisma.attendanceRecord.upsert({
              where: {
                tenantId_clientRecordId: {
                  tenantId: request.tenant!.id,
                  clientRecordId: r.clientRecordId ?? "",
                },
              },
              update: {
                status: r.status,
                clientRecordId: r.clientRecordId,
              },
              create: {
                sessionId: session!.id,
                studentId: r.studentId,
                status: r.status,
                clientRecordId: r.clientRecordId,
              },
            })
          )
        );

        return reply.code(201).send({
          sessionId: session.id,
          date: session.date,
          recordsCount: createdRecords.length,
        });
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.code(404).send({ error: "not_found" });
        }
        throw error;
      }
    }
  );

  // Get attendance history for a student
  app.get(
    "/students/:studentId/attendance",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "TEACHER", "PARENT"])] },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      const { limit = "30" } = request.query as { limit?: string };

      const records = await prisma.attendanceRecord.findMany({
        where: { studentId },
        include: {
          session: { select: { date: true, classSection: { select: { name: true } } } },
        },
        orderBy: { session: { date: "desc" } },
        take: parseInt(limit as string),
      });

      return reply.send({ items: records });
    }
  );
}
