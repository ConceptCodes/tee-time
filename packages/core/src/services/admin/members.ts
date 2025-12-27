import type { Database } from "@tee-time/database";
import { createMemberRepository } from "@tee-time/database";
import { logger } from "../../logger";

export const createMemberProfile = async (
  db: Database,
  data: Parameters<ReturnType<typeof createMemberRepository>["create"]>[0]
) => {
  const repo = createMemberRepository(db);
  const result = await repo.create(data);
  logger.info("core.admin.members.create", { memberId: result.id });
  return result;
};

export const updateMemberProfile = async (
  db: Database,
  id: string,
  data: Parameters<ReturnType<typeof createMemberRepository>["update"]>[1]
) => {
  const repo = createMemberRepository(db);
  const result = await repo.update(id, data);
  logger.info("core.admin.members.update", { memberId: id });
  return result;
};

export const disableMemberProfile = async (db: Database, id: string) => {
  const repo = createMemberRepository(db);
  const result = await repo.disable(id);
  logger.info("core.admin.members.disable", { memberId: id });
  return result;
};

export const listMembers = async (
  db: Database,
  params?: { search?: string; limit?: number; offset?: number }
) => {
  const repo = createMemberRepository(db);
  const [result, total] = await Promise.all([
    repo.list(params),
    repo.count({ search: params?.search })
  ]);
  logger.info("core.admin.members.list", {
    count: result.length,
    hasSearch: Boolean(params?.search),
    limit: params?.limit ?? null,
    offset: params?.offset ?? null
  });
  return { data: result, total };
};

export const getMemberById = async (db: Database, id: string) => {
  const repo = createMemberRepository(db);
  const result = await repo.getById(id);
  logger.info("core.admin.members.get", { memberId: id, found: Boolean(result) });
  return result;
};
