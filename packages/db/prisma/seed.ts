import { systemPrisma, runWithTenant, prisma } from "../src/index.js";

/**
 * Dev seed: one demo school with an admin, a teacher (approved), one class
 * section, and a couple of students with guardians. Idempotent-ish â€” safe to
 * re-run after `prisma migrate reset`.
 */
async function main() {
  // App-level admin user (not assigned to any school)
  const appAdmin = await systemPrisma.user.upsert({
    where: { phone: "+919999900000" },
    update: {},
    create: { phone: "+919999900000", displayName: "Platform Admin" },
  });

  const tenant = await systemPrisma.tenant.upsert({
    where: { slug: "demo-public-school" },
    update: {},
    create: {
      name: "Demo Public School",
      slug: "demo-public-school",
      schoolCode: "DEMO01",
      // TODO: Add phone field once migration is applied
      // phone: "+919999900111",
      status: "ACTIVE",
    },
  });

  const admin = await systemPrisma.user.upsert({
    where: { phone: "+919999900001" },
    update: {},
    create: { phone: "+919999900001", displayName: "Asha Admin" },
  });
  const teacher = await systemPrisma.user.upsert({
    where: { phone: "+919999900002" },
    update: {},
    create: { phone: "+919999900002", displayName: "Ravi Teacher" },
  });
  const parent = await systemPrisma.user.upsert({
    where: { phone: "+919999900003" },
    update: {},
    create: { phone: "+919999900003", displayName: "Priya Parent" },
  });

  // US test users
  const usAdmin = await systemPrisma.user.upsert({
    where: { phone: "+15551234001" },
    update: {},
    create: { phone: "+15551234001", displayName: "Sarah Admin (US)" },
  });
  const usTeacher = await systemPrisma.user.upsert({
    where: { phone: "+15551234002" },
    update: {},
    create: { phone: "+15551234002", displayName: "John Teacher (US)" },
  });
  const usParent = await systemPrisma.user.upsert({
    where: { phone: "+15551234003" },
    update: {},
    create: { phone: "+15551234003", displayName: "Emily Parent (US)" },
  });

  await systemPrisma.membership.upsert({
    where: { tenantId_userId_role: { tenantId: tenant.id, userId: admin.id, role: "SCHOOL_ADMIN" } },
    update: { status: "ACTIVE" },
    create: { tenantId: tenant.id, userId: admin.id, role: "SCHOOL_ADMIN", status: "ACTIVE" },
  });
  await systemPrisma.membership.upsert({
    where: { tenantId_userId_role: { tenantId: tenant.id, userId: teacher.id, role: "TEACHER" } },
    update: { status: "ACTIVE", approvedByUserId: admin.id },
    create: {
      tenantId: tenant.id,
      userId: teacher.id,
      role: "TEACHER",
      status: "ACTIVE",
      approvedByUserId: admin.id,
    },
  });
  await systemPrisma.membership.upsert({
    where: { tenantId_userId_role: { tenantId: tenant.id, userId: parent.id, role: "PARENT" } },
    update: { status: "ACTIVE" },
    create: { tenantId: tenant.id, userId: parent.id, role: "PARENT", status: "ACTIVE" },
  });

  // US users (same school)
  await systemPrisma.membership.upsert({
    where: { tenantId_userId_role: { tenantId: tenant.id, userId: usAdmin.id, role: "SCHOOL_ADMIN" } },
    update: { status: "ACTIVE" },
    create: { tenantId: tenant.id, userId: usAdmin.id, role: "SCHOOL_ADMIN", status: "ACTIVE" },
  });
  await systemPrisma.membership.upsert({
    where: { tenantId_userId_role: { tenantId: tenant.id, userId: usTeacher.id, role: "TEACHER" } },
    update: { status: "ACTIVE", approvedByUserId: usAdmin.id },
    create: {
      tenantId: tenant.id,
      userId: usTeacher.id,
      role: "TEACHER",
      status: "ACTIVE",
      approvedByUserId: usAdmin.id,
    },
  });
  await systemPrisma.membership.upsert({
    where: { tenantId_userId_role: { tenantId: tenant.id, userId: usParent.id, role: "PARENT" } },
    update: { status: "ACTIVE" },
    create: { tenantId: tenant.id, userId: usParent.id, role: "PARENT", status: "ACTIVE" },
  });

  await runWithTenant(tenant.id, async () => {
    const year = await prisma.academicYear.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "2026-27" } },
      update: { isCurrent: true },
      create: {
        name: "2026-27",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true,
      },
    });

    const level = await prisma.classLevel.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Grade 1" } },
      update: {},
      create: { name: "Grade 1", rank: 1 },
    });

    const section = await prisma.classSection.upsert({
      where: {
        tenantId_academicYearId_classLevelId_name: {
          tenantId: tenant.id,
          academicYearId: year.id,
          classLevelId: level.id,
          name: "A",
        },
      },
      update: { classTeacherId: teacher.id },
      create: {
        name: "A",
        classLevelId: level.id,
        academicYearId: year.id,
        classTeacherId: teacher.id,
      },
    });

    for (const [i, name] of [["Aarav", "Sharma"], ["Diya", "Patel"]].entries()) {
      const student = await prisma.student.upsert({
        where: { tenantId_admissionNo: { tenantId: tenant.id, admissionNo: `ADM10${i + 1}` } },
        update: {},
        create: {
          firstName: name[0]!,
          lastName: name[1]!,
          admissionNo: `ADM10${i + 1}`,
          classSectionId: section.id,
        },
      });

      const guardian = await prisma.guardian.create({
        data: {
          firstName: "Priya",
          lastName: name[1]!,
          phone: parent.phone,
          userId: parent.id,
        },
      });
      await prisma.guardianStudent.upsert({
        where: {
          tenantId_guardianId_studentId: {
            tenantId: tenant.id,
            guardianId: guardian.id,
            studentId: student.id,
          },
        },
        update: {},
        create: { guardianId: guardian.id, studentId: student.id, relation: "mother", isPrimary: true },
      });
      await prisma.consentRecord.upsert({
        where: {
          tenantId_guardianId_studentId_scope: {
            tenantId: tenant.id,
            guardianId: guardian.id,
            studentId: student.id,
            scope: "GENERAL_DATA_PROCESSING",
          },
        },
        update: { granted: true },
        create: {
          guardianId: guardian.id,
          studentId: student.id,
          scope: "GENERAL_DATA_PROCESSING",
          granted: true,
          capturedVia: "seed",
        },
      });
    }
  });

  console.log(`Seeded tenant "${tenant.name}" (${tenant.slug}) â€” school code ${tenant.schoolCode}`);
  console.log("Test login numbers:");
  console.log("  Platform Admin: +919999900000");
  console.log("  India - School Admin: +919999900001 Â· Teacher: +919999900002 Â· Parent: +919999900003");
  console.log("  US    - School Admin: +15551234001 Â· Teacher: +15551234002 Â· Parent: +15551234003");
}

main()
  .then(() => systemPrisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await systemPrisma.$disconnect();
    process.exit(1);
  });
