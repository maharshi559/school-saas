export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
  dateOfBirth?: string;
  classSectionId?: string;
  enrollmentStatus?: string;
  classSection?: { id: string; name: string };
};

export type SidebarView =
  | "dashboard" | "students" | "teachers" | "classes" | "attendance"
  | "finance" | "consent" | "communication" | "members" | "account" | "settings";

export type StudentFormData = {
  firstName: string;
  lastName: string;
  admissionNo: string;
  dateOfBirth: string;
  classSectionId: string;
  enrollmentStatus: "ENROLLED" | "INACTIVE" | "GRADUATED" | "TRANSFERRED";
};

export type ClassSection = {
  id: string;
  name: string;
  classLevel: { name: string };
  _count: { students: number };
};

export type AttendanceStudent = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
};

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  schoolCode: string;
  status: string;
  createdAt: string;
  _count: { memberships: number; students: number };
  adminPhone?: string;
  adminName?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  website?: string;
  schoolType?: string;
  board?: string;
  establishedYear?: number;
};

export type SchoolFormData = {
  schoolName: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  website: string;
  schoolType: string;
  board: string;
  establishedYear: string;
};

export type UserWithRoles = {
  id: string;
  phone: string;
  displayName: string;
  roles: Array<{ role: "APP_ADMIN" | "APP_SUPPORT"; grantedAt: string }>;
};
