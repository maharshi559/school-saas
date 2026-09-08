import { FastifyRequest } from "fastify";
import { prisma } from "@iskool/db";

// TEST: Deliberate security issues for security-reviewer to catch

export async function getStudentsUNSAFE(req: FastifyRequest) {
  // ❌ BUG 1: Missing tenantId filter - one tenant can see another's students
  const students = await prisma.student.findMany({
    where: { classId: req.query.classId as string }
  });
  return students;
}

export async function deleteStudentUNSAFE(req: FastifyRequest) {
  // ❌ BUG 2: No membership validation - user might not belong to this tenant
  const studentId = req.body.studentId;
  const tenantId = req.body.tenantId;

  await prisma.student.update({
    where: { id: studentId },
    data: { deletedAt: new Date() }
  });

  return { success: true };
}

export async function getTeacherFeesSUNSAFE(req: FastifyRequest) {
  // ❌ BUG 3: Using systemPrisma instead of tenant-scoped prisma
  const teacherId = req.params.teacherId;

  // This should NEVER use systemPrisma - breaks tenant isolation
  const fees = await prisma.studentFee.findMany({
    where: {
      student: { teacher: { id: teacherId } }
    }
  });

  return fees;
}

export async function grantRoleUNSAFE(req: FastifyRequest) {
  // ❌ BUG 4: Checking app-level role instead of tenant-level membership
  const user = req.user; // from JWT
  const targetTenantId = req.body.tenantId;
  const newRole = req.body.role;

  // WRONG: Checking if user is APP_ADMIN instead of SCHOOL_ADMIN of this tenant
  if (!user.userRoles.some(r => r.role === "APP_ADMIN")) {
    throw new Error("Not authorized");
  }

  // This allows APP_ADMIN to grant roles they shouldn't have access to
  // Should check: user.memberships.find(m => m.tenantId === targetTenantId).role === "SCHOOL_ADMIN"
}
