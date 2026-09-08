import { z } from "zod";
import { ENROLLMENT_STATUS } from "../enums.js";

export const createStudentSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().default(""),
  admissionNo: z.string().trim().min(1).max(40),
  dateOfBirth: z.string().date().optional(),
  classSectionId: z.string().optional(),
  guardianIds: z.array(z.string()).default([]),
});
export type CreateStudent = z.infer<typeof createStudentSchema>;

export const studentSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  admissionNo: z.string(),
  dateOfBirth: z.string().nullable(),
  enrollmentStatus: z.enum(ENROLLMENT_STATUS),
  classSectionId: z.string().nullable(),
  createdAt: z.string(),
});
export type Student = z.infer<typeof studentSchema>;

export const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
