import type { auth } from "../auth";
import type { StaffUser } from "@syndicate/database";

export type Session = typeof auth.$Infer.Session;

export type ApiVariables = {
  requestId: string;
  requestStart: number;
  session: Session | null;
  staffUser: StaffUser | null;
  validatedBody?: unknown;
};
