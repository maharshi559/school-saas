import type { FastifyInstance } from "fastify";
import { prisma } from "@school/db";
import { z } from "zod";

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

      // Verify student belongs to the school
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student || student.tenantId !== request.tenant.id) {
        return reply.code(404).send({ error: "Student not found" });
      }

      // Calculate percentage
      const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

      const examScore = await prisma.examScore.create({
        data: {
          tenantId: request.tenant.id,
          studentId,
          subject,
          examName,
          score: parseFloat(score.toFixed(2)),
          maxScore: parseFloat(maxScore.toFixed(2)),
          percentage: parseFloat(percentage.toFixed(2)),
          remarks: remarks || null,
          createdByUserId: request.user.id,
        },
      });

      return reply.code(201).send(examScore);
    }
  );

  // Get exam scores for a student (all roles can view)
  app.get(
    "/students/:studentId/exam-scores",
    { preHandler: [app.authenticate, app.tenantScope()] },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };

      // Verify student belongs to the school
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student || student.tenantId !== request.tenant.id) {
        return reply.code(404).send({ error: "Student not found" });
      }

      // Check parent permissions: parents can only view their own children's scores
      if (request.membership?.role === "PARENT") {
        const isGuardian = await prisma.guardianStudent.findFirst({
          where: {
            tenantId: request.tenant.id,
            studentId,
            guardian: {
              userId: request.user.id,
            },
          },
        });

        if (!isGuardian) {
          return reply.code(403).send({ error: "You can only view your own child's scores" });
        }
      }

      const examScores = await prisma.examScore.findMany({
        where: {
          tenantId: request.tenant.id,
          studentId,
          deletedAt: null,
        },
        include: {
          createdBy: {
            select: { id: true, displayName: true, phone: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send(examScores);
    }
  );

  // Get exam scores by subject and exam (for analytics)
  app.get(
    "/exam-scores",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"])] },
    async (request, reply) => {
      const { subject, examName, classSectionId } = request.query as {
        subject?: string;
        examName?: string;
        classSectionId?: string;
      };

      const whereClause: any = {
        tenantId: request.tenant.id,
        deletedAt: null,
      };

      if (subject) whereClause.subject = subject;
      if (examName) whereClause.examName = examName;

      let query: any = {
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNo: true,
              classSectionId: true,
            },
          },
          createdBy: {
            select: { id: true, displayName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      };

      // Filter by class section if provided
      if (classSectionId) {
        query.where.student = {
          classSectionId,
        };
      }

      const examScores = await prisma.examScore.findMany(query);

      return reply.send(examScores);
    }
  );

  // Update exam score (non-parent roles only)
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

      const examScore = await prisma.examScore.findUnique({
        where: { id: scoreId },
      });

      if (!examScore || examScore.tenantId !== request.tenant.id) {
        return reply.code(404).send({ error: "Exam score not found" });
      }

      // Calculate new percentage if score or maxScore changed
      let percentage = examScore.percentage;
      if (score !== undefined && maxScore !== undefined) {
        percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      } else if (score !== undefined && maxScore === undefined) {
        percentage = examScore.maxScore > 0 ? (score / examScore.maxScore) * 100 : 0;
      } else if (score === undefined && maxScore !== undefined) {
        percentage = maxScore > 0 ? (examScore.score.toNumber() / maxScore) * 100 : 0;
      }

      const updated = await prisma.examScore.update({
        where: { id: scoreId },
        data: {
          score: score ? parseFloat(score.toFixed(2)) : undefined,
          maxScore: maxScore ? parseFloat(maxScore.toFixed(2)) : undefined,
          percentage: parseFloat(percentage.toFixed(2)),
          remarks: remarks !== undefined ? remarks : undefined,
          subject: subject || undefined,
          examName: examName || undefined,
          updatedAt: new Date(),
        },
        include: {
          createdBy: { select: { id: true, displayName: true } },
        },
      });

      return reply.send(updated);
    }
  );

  // Delete exam score (soft delete)
  app.delete(
    "/exam-scores/:scoreId",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL"])] },
    async (request, reply) => {
      const { scoreId } = request.params as { scoreId: string };

      const examScore = await prisma.examScore.findUnique({
        where: { id: scoreId },
      });

      if (!examScore || examScore.tenantId !== request.tenant.id) {
        return reply.code(404).send({ error: "Exam score not found" });
      }

      const deleted = await prisma.examScore.update({
        where: { id: scoreId },
        data: { deletedAt: new Date() },
      });

      return reply.send(deleted);
    }
  );

  // Get exam statistics for a class section
  app.get(
    "/exam-statistics/:classSectionId",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"])] },
    async (request, reply) => {
      const { classSectionId } = request.params as { classSectionId: string };
      const { examName, subject } = request.query as { examName?: string; subject?: string };

      // Verify class section belongs to school
      const classSection = await prisma.classSection.findUnique({
        where: { id: classSectionId },
      });

      if (!classSection || classSection.tenantId !== request.tenant.id) {
        return reply.code(404).send({ error: "Class section not found" });
      }

      const whereClause: any = {
        tenantId: request.tenant.id,
        student: { classSectionId },
        deletedAt: null,
      };

      if (examName) whereClause.examName = examName;
      if (subject) whereClause.subject = subject;

      const examScores = await prisma.examScore.findMany({
        where: whereClause,
        select: {
          percentage: true,
          score: true,
          maxScore: true,
          subject: true,
          examName: true,
          student: { select: { id: true } },
        },
      });

      // Calculate statistics by exam and subject
      const stats: any = {};

      for (const score of examScores) {
        const key = `${score.examName}_${score.subject}`;
        if (!stats[key]) {
          stats[key] = {
            examName: score.examName,
            subject: score.subject,
            count: 0,
            totalScore: 0,
            avgPercentage: 0,
            maxPercentage: 0,
            minPercentage: 100,
          };
        }

        stats[key].count++;
        stats[key].totalScore += score.percentage.toNumber();
        stats[key].maxPercentage = Math.max(stats[key].maxPercentage, score.percentage.toNumber());
        stats[key].minPercentage = Math.min(stats[key].minPercentage, score.percentage.toNumber());
      }

      // Calculate averages
      for (const key in stats) {
        stats[key].avgPercentage = stats[key].count > 0 ? stats[key].totalScore / stats[key].count : 0;
        stats[key].avgPercentage = parseFloat(stats[key].avgPercentage.toFixed(2));
      }

      return reply.send(Object.values(stats));
    }
  );
}
