export interface StaffUser {
  id: string;
  authUserId: string;
  email: string;
  name: string;
  role: "admin" | "staff" | "member";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
}
