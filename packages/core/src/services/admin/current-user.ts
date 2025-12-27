import type { Database } from "@syndicate/database";
import { createStaffRepository } from "@syndicate/database";
import { logger } from "../../logger";

export const getCurrentUserProfile = async (
  db: Database,
  params: { authUserId: string; email?: string | null }
) => {
  const staffRepo = createStaffRepository(db);
  const staffUser = await staffRepo.getByAuthUserId(params.authUserId);
  if (staffUser) {
    logger.info("core.admin.currentUser.get", {
      authUserId: params.authUserId,
      type: "staff"
    });
    return { type: "staff" as const, staffUser };
  }

  if (params.email) {
    const fallbackStaff = await staffRepo.getByEmail(params.email);
    if (fallbackStaff) {
      logger.info("core.admin.currentUser.get", {
        authUserId: params.authUserId,
        type: "staff"
      });
      return { type: "staff" as const, staffUser: fallbackStaff };
    }
  }

  logger.info("core.admin.currentUser.get", {
    authUserId: params.authUserId,
    type: "unknown"
  });
  return { type: "unknown" as const };
};

export const updateCurrentUserProfile = async (
  db: Database,
  params: { authUserId: string; email?: string | null; data: Record<string, unknown> }
) => {
  const staffRepo = createStaffRepository(db);
  const staffUser = await staffRepo.getByAuthUserId(params.authUserId);
  if (staffUser) {
    const result = await staffRepo.update(staffUser.id, params.data);
    logger.info("core.admin.currentUser.update", {
      authUserId: params.authUserId,
      type: "staff"
    });
    return result;
  }

  if (params.email) {
    const fallbackStaff = await staffRepo.getByEmail(params.email);
    if (fallbackStaff) {
      const result = await staffRepo.update(fallbackStaff.id, params.data);
      logger.info("core.admin.currentUser.update", {
        authUserId: params.authUserId,
        type: "staff"
      });
      return result;
    }
  }

  logger.info("core.admin.currentUser.update", {
    authUserId: params.authUserId,
    type: "unknown"
  });
  return null;
};
