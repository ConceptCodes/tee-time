import { createMemberRepository, type Database } from "@syndicate/database";
import { logger } from "./logger";

export type MemberPreferencesUpdate = {
  preferredLocationLabel?: string;
  preferredTimeOfDay?: string;
  preferredBayLabel?: string;
};

export const updateMemberPreferences = async (
  db: Database,
  memberId: string,
  update: MemberPreferencesUpdate
) => {
  const repo = createMemberRepository(db);
  const result = await repo.update(memberId, {
    preferredLocationLabel: update.preferredLocationLabel,
    preferredTimeOfDay: update.preferredTimeOfDay,
    preferredBayLabel: update.preferredBayLabel,
    updatedAt: new Date()
  });
  if (result) {
    logger.info("core.member.preferences.update", { memberId });
  }
  return result;
};
