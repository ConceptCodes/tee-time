import type { Database } from "@tee-time/database";
import { createStaffRepository } from "@tee-time/database";
import { logger } from "../../logger";

export const createStaffUser = async (
  db: Database,
  data: Parameters<ReturnType<typeof createStaffRepository>["create"]>[0]
) => {
  const repo = createStaffRepository(db);
  const result = await repo.create(data);
  logger.info("core.admin.staff.create", { staffUserId: result.id });
  return result;
};

export const updateStaffUser = async (
  db: Database,
  id: string,
  data: Parameters<ReturnType<typeof createStaffRepository>["update"]>[1]
) => {
  const repo = createStaffRepository(db);
  const result = await repo.update(id, data);
  logger.info("core.admin.staff.update", { staffUserId: id });
  return result;
};

export const disableStaffUser = async (db: Database, id: string) => {
  const repo = createStaffRepository(db);
  const result = await repo.update(id, { isActive: false, updatedAt: new Date() });
  logger.info("core.admin.staff.disable", { staffUserId: id });
  return result;
};

export const listStaffUsers = async (
  db: Database,
  params?: { limit?: number; offset?: number }
) => {
  const repo = createStaffRepository(db);
  const [result, total] = await Promise.all([repo.list(params), repo.count()]);
  logger.info("core.admin.staff.list", {
    count: result.length,
    limit: params?.limit ?? null,
    offset: params?.offset ?? null
  });
  return { data: result, total };
};

export const getStaffUserById = async (db: Database, id: string) => {
  const repo = createStaffRepository(db);
  const result = await repo.getById(id);
  logger.info("core.admin.staff.get", {
    staffUserId: id,
    found: Boolean(result)
  });
  return result;
};
