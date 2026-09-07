import type { FastifyInstance } from "fastify";
import { prisma } from "@school/db";
import { z } from "zod";

const createFeeStructureSchema = z.object({
  name: z.string().min(1, "Fee name required"),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.number().int().min(1).max(31),
  frequency: z.enum(["annual", "semester", "monthly"]).default("annual"),
});

const createStudentFeeSchema = z.object({
  studentId: z.string().min(1),
  feeStructureId: z.string().min(1),
  dueDate: z.string().date(),
  amount: z.number().positive().optional(),
  notes: z.string().optional(),
});

const createPaymentSchema = z.object({
  studentFeeId: z.string().min(1),
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["CASH", "CHECK", "BANK_TRANSFER", "CARD", "UPI", "OTHER"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
  paidBy: z.string().optional(),
});

const createExpenseSchema = z.object({
  category: z.enum([
    "SALARY",
    "UTILITIES",
    "MAINTENANCE",
    "SUPPLIES",
    "TRANSPORTATION",
    "FOOD",
    "EQUIPMENT",
    "OTHER",
  ]),
  amount: z.number().positive("Amount must be positive"),
  date: z.string().date(),
  vendor: z.string().optional(),
  description: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function financeRoutes(app: FastifyInstance) {
  // Fee Structures - CRUD
  app.get(
    "/fee-structures",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const structures = await prisma.feeStructure.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({ items: structures });
    }
  );

  app.post(
    "/fee-structures",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const parsed = createFeeStructureSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      const structure = await prisma.feeStructure.create({
        data: parsed.data,
      });

      return reply.code(201).send(structure);
    }
  );

  app.patch(
    "/fee-structures/:id",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = createFeeStructureSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      try {
        const structure = await prisma.feeStructure.update({
          where: { id },
          data: parsed.data,
        });
        return reply.send(structure);
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.code(404).send({ error: "not_found" });
        }
        throw error;
      }
    }
  );

  app.delete(
    "/fee-structures/:id",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        await prisma.feeStructure.update({
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
    }
  );

  // Student Fees - Assign and track
  app.get(
    "/students/:studentId/fees",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN", "TEACHER", "PARENT"])] },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };

      const fees = await prisma.studentFee.findMany({
        where: {
          studentId,
          deletedAt: null,
        },
        include: {
          feeStructure: true,
          payments: { orderBy: { paidAt: "desc" } },
        },
        orderBy: { dueDate: "asc" },
      });

      return reply.send({ items: fees });
    }
  );

  app.post(
    "/student-fees",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const parsed = createStudentFeeSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      const { studentId, feeStructureId, dueDate, amount, notes } = parsed.data;

      // Get fee structure to use its amount if not provided
      const structure = await prisma.feeStructure.findUnique({
        where: { id: feeStructureId },
      });

      if (!structure) {
        return reply.code(404).send({ error: "fee_structure_not_found" });
      }

      try {
        const fee = await prisma.studentFee.create({
          data: {
            studentId,
            feeStructureId,
            dueDate: new Date(dueDate),
            amount: amount || structure.amount,
            notes,
          },
          include: { payments: true },
        });

        return reply.code(201).send(fee);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply.code(409).send({ error: "duplicate_fee" });
        }
        throw error;
      }
    }
  );

  // Payments - Record & track
  app.post(
    "/payments",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const parsed = createPaymentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      const { studentFeeId, amount, method, reference, notes, paidBy } = parsed.data;

      try {
        // Get the fee record
        const fee = await prisma.studentFee.findUnique({
          where: { id: studentFeeId },
          include: { payments: true },
        });

        if (!fee) {
          return reply.code(404).send({ error: "fee_not_found" });
        }

        // Create payment
        const payment = await prisma.payment.create({
          data: {
            studentFeeId,
            amount,
            method,
            reference,
            notes,
            paidBy,
          },
        });

        // Update fee status based on amount paid
        const totalPaid = fee.payments.reduce((sum, p) => sum + Number(p.amount), 0) + amount;
        const newStatus =
          totalPaid >= Number(fee.amount)
            ? "PAID"
            : totalPaid > 0
              ? "PARTIAL"
              : fee.dueDate < new Date()
                ? "OVERDUE"
                : "PENDING";

        await prisma.studentFee.update({
          where: { id: studentFeeId },
          data: {
            amountPaid: totalPaid,
            status: newStatus,
          },
        });

        return reply.code(201).send(payment);
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.code(404).send({ error: "not_found" });
        }
        throw error;
      }
    }
  );

  // Expenses - Track & categorize
  app.get(
    "/expenses",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const { startDate, endDate, category } = request.query as {
        startDate?: string;
        endDate?: string;
        category?: string;
      };

      const where: any = { deletedAt: null };
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }
      if (category) where.category = category;

      const expenses = await prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
      });

      // Calculate totals by category
      const byCategory = expenses.reduce(
        (acc, e) => {
          acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
          return acc;
        },
        {} as Record<string, number>
      );

      return reply.send({
        items: expenses,
        summary: {
          total: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
          byCategory,
        },
      });
    }
  );

  app.post(
    "/expenses",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const parsed = createExpenseSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      const expense = await prisma.expense.create({
        data: parsed.data,
      });

      return reply.code(201).send(expense);
    }
  );

  // Finance Summary/Dashboard
  app.get(
    "/finance/summary",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const studentFees = await prisma.studentFee.findMany({
        where: { deletedAt: null },
        include: { payments: true },
      });

      const expenses = await prisma.expense.findMany({
        where: { deletedAt: null },
      });

      const totalFeeAmount = studentFees.reduce((sum, f) => sum + Number(f.amount), 0);
      const totalPaid = studentFees.reduce((sum, f) => sum + Number(f.amountPaid), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalOverdue = studentFees
        .filter((f) => f.status === "OVERDUE" || (f.dueDate < new Date() && f.status !== "PAID"))
        .reduce((sum, f) => sum + (Number(f.amount) - Number(f.amountPaid)), 0);

      return reply.send({
        totalFeeAmount,
        totalPaid,
        totalExpenses,
        totalOverdue,
        pending: totalFeeAmount - totalPaid,
        netBalance: totalPaid - totalExpenses,
        feesByStatus: {
          paid: studentFees.filter((f) => f.status === "PAID").length,
          partial: studentFees.filter((f) => f.status === "PARTIAL").length,
          pending: studentFees.filter((f) => f.status === "PENDING").length,
          overdue: studentFees.filter((f) => f.status === "OVERDUE").length,
        },
      });
    }
  );

  // Report: Students with pending/overdue fees
  app.get(
    "/finance/pending-fees",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const fees = await prisma.studentFee.findMany({
        where: {
          deletedAt: null,
          status: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
        },
        include: {
          student: true,
          feeStructure: true,
          payments: true,
        },
        orderBy: { dueDate: "asc" },
      });

      return reply.send({ items: fees });
    }
  );

  // Report: Monthly expense breakdown
  app.get(
    "/finance/expense-report",
    { preHandler: [app.authenticate, app.tenantScope(["SCHOOL_ADMIN"])] },
    async (request, reply) => {
      const today = new Date().toISOString().split("T")[0] as string;
      const q = request.query as Record<string, string | undefined>;
      const startDate = new Date(q["startDate"] ?? today);
      const endDate = new Date(q["endDate"] ?? today);
      endDate.setHours(23, 59, 59);

      const expenses = await prisma.expense.findMany({
        where: {
          deletedAt: null,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: "desc" },
      });

      const byCategory = expenses.reduce(
        (acc, e) => {
          const entry = acc[e.category] ?? { count: 0, total: 0 };
          acc[e.category] = { count: entry.count + 1, total: entry.total + Number(e.amount) };
          return acc;
        },
        {} as Record<string, { count: number; total: number }>
      );

      return reply.send({
        items: expenses,
        period: { startDate, endDate },
        summary: {
          total: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
          count: expenses.length,
          byCategory,
        },
      });
    }
  );
}
