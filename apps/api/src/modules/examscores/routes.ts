import type { FastifyInstance } from "fastify";
import { prisma } from "@school/db";
import { z } from "zod";

// prisma.examScore is available after migration; cast until then
const db = prisma as any;

export async function examScoresRoutes(app: FastifyInstance) {
  // ────────────────────── Exam Scores CRUD ──────────────────────

  // Create exam score (non-parent roles only)
  app.post(
    "/exam-scores",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "ACCOUNTANT"])] },
    async (request, reply) => {
      const { studentId, subject, examName, score, maxScore, remarks } = z
        .object({
          studentId: z.string(),
          subject: z.string(),
          examName: z.string(),
          score: z.number().min(0),
          maxScore: z.number().min(0),
          remarks: z.string().optional(),
        })
        .parse(request.body);

      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student || student.tenantId !== request.tenant!.id) {
        return reply.code(404).send({ error: "Student not found" });
      }

      const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

      const examScore = await db.examScore.create({
        data: {
          tenantId: request.tenant!.id,
          studentId,
          subject,
          examName,
          score: parseFloat(score.toFixed(2)),
          maxScore: parseFloat(maxScore.toFixed(2)),
          percentage: parseFloat(percentage.toFixed(2)),
          remarks: remarks || null,
          createdByUserId: request.currentUser!.id,
        },
      });

      return reply.code(201).send(examScore);
    }
  );

  // Get exam scores for a student (all roles — parents restricted to own children)
  app.get(
    "/students/:studentId/exam-scores",
    { preHandler: [app.authenticate, app.tenantScope()] },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      const tenantId = request.tenant!.id;

      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student || student.tenantId !== tenantId) {
        return reply.code(404).send({ error: "Student not found" });
      }

      // Parents can only view their own children's scores
      if ((request.tenant!.role as string) === "PARENT") {
        const isGuardian = await prisma.guardianStudent.findFirst({
          where: {
            tenantId,
            studentId,
            guardian: { userId: request.currentUser!.id },
          },
        });
        if (!isGuardian) {
          return reply.code(403).send({ error: "You can only view your own child's scores" });
        }
      }

      const examScores = await db.examScore.findMany({
        where: { tenantId, studentId, deletedAt: null },
        include: { createdBy: { select: { id: true, displayName: true, phone: true } } },
        orderBy: { createdAt: "desc" },
      });

      return reply.send(examScores);
    }
  );

  // List scores with filters (non-parent roles)
  app.get(
    "/exam-scores",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"])] },
    async (request, reply) => {
      const { subject, examName, classSectionId } = request.query as {
        subject?: string;
        examName?: string;
        classSectionId?: string;
      };

      const where: any = { tenantId: request.tenant!.id, deletedAt: null };
      if (subject) where.subject = subject;
      if (examName) where.examName = examName;
      if (classSectionId) where.student = { classSectionId };

      const examScores = await db.examScore.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, classSectionId: true } },
          createdBy: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send(examScores);
    }
  );

  // Update exam score
  app.patch(
    "/exam-scores/:scoreId",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"])] },
    async (request, reply) => {
      const { scoreId } = request.params as { scoreId: string };
      const { score, maxScore, remarks, subject, examName } = z
        .object({
          score: z.number().min(0).optional(),
          maxScore: z.number().min(0).optional(),
          remarks: z.string().optional(),
          subject: z.string().optional(),
          examName: z.string().optional(),
        })
        .parse(request.body);

      const existing = await db.examScore.findUnique({ where: { id: scoreId } });
      if (!existing || existing.tenantId !== request.tenant!.id) {
        return reply.code(404).send({ error: "Exam score not found" });
      }

      const newScore = score ?? Number(existing.score);
      const newMax = maxScore ?? Number(existing.maxScore);
      const percentage = newMax > 0 ? (newScore / newMax) * 100 : 0;

      const updated = await db.examScore.update({
        where: { id: scoreId },
        data: {
          score: parseFloat(newScore.toFixed(2)),
          maxScore: parseFloat(newMax.toFixed(2)),
          percentage: parseFloat(percentage.toFixed(2)),
          ...(remarks !== undefined && { remarks }),
          ...(subject && { subject }),
          ...(examName && { examName }),
        },
        include: { createdBy: { select: { id: true, displayName: true } } },
      });

      return reply.send(updated);
    }
  );

  // Soft-delete exam score (admin/principal only)
  app.delete(
    "/exam-scores/:scoreId",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL"])] },
    async (request, reply) => {
      const { scoreId } = request.params as { scoreId: string };

      const existing = await db.examScore.findUnique({ where: { id: scoreId } });
      if (!existing || existing.tenantId !== request.tenant!.id) {
        return reply.code(404).send({ error: "Exam score not found" });
      }

      await db.examScore.update({ where: { id: scoreId }, data: { deletedAt: new Date() } });
      return reply.code(204).send();
    }
  );

  // Class-level exam statistics
  app.get(
    "/exam-statistics/:classSectionId",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"])] },
    async (request, reply) => {
      const { classSectionId } = request.params as { classSectionId: string };
      const { examName, subject } = request.query as { examName?: string; subject?: string };
      const tenantId = request.tenant!.id;

      const classSection = await prisma.classSection.findUnique({ where: { id: classSectionId } });
      if (!classSection || classSection.tenantId !== tenantId) {
        return reply.code(404).send({ error: "Class section not found" });
      }

      const where: any = { tenantId, student: { classSectionId }, deletedAt: null };
      if (examName) where.examName = examName;
      if (subject) where.subject = subject;

      const scores: any[] = await db.examScore.findMany({
        where,
        select: { percentage: true, subject: true, examName: true },
      });

      type Stat = { examName: string; subject: string; count: number; total: number; max: number; min: number };
      const statsMap: Record<string, Stat> = {};

      for (const s of scores) {
        const key = `${s.examName}__${s.subject}`;
        const pct = Number(s.percentage);
        if (!statsMap[key]) {
          statsMap[key] = { examName: s.examName, subject: s.subject, count: 0, total: 0, max: 0, min: 100 };
        }
        const entry = statsMap[key]!;
        entry.count++;
        entry.total += pct;
        entry.max = Math.max(entry.max, pct);
        entry.min = Math.min(entry.min, pct);
      }

      const result = Object.values(statsMap).map((s) => ({
        ...s,
        avg: s.count > 0 ? parseFloat((s.total / s.count).toFixed(2)) : 0,
      }));

      return reply.send(result);
    }
  );
}
