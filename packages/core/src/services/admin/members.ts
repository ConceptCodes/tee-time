import type { Database, NewMemberProfile } from "@tee-time/database";
import { createMemberRepository } from "@tee-time/database";
import { randomUUID } from "crypto";
import { logger } from "../../logger";

const MEMBERSHIP_ID_PREFIX = "MEM-";
const MEMBERSHIP_ID_ATTEMPTS = 5;

const generateMembershipId = () =>
  `${MEMBERSHIP_ID_PREFIX}${randomUUID().split("-")[0].toUpperCase()}`;

export type MemberProfileCreateInput = Omit<NewMemberProfile, "membershipId"> & {
  membershipId?: string;
};

export const createMemberProfile = async (
  db: Database,
  data: MemberProfileCreateInput
) => {
  const repo = createMemberRepository(db);
  let membershipId = data.membershipId;
  if (!membershipId) {
    for (let attempt = 0; attempt < MEMBERSHIP_ID_ATTEMPTS; attempt += 1) {
      const candidate = generateMembershipId();
      const existing = await repo.getByMembershipId(candidate);
      if (!existing) {
        membershipId = candidate;
        break;
      }
    }
  }
  if (!membershipId) {
    throw new Error("membership_id_generation_failed");
  }
  const result = await repo.create({ ...data, membershipId });
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
