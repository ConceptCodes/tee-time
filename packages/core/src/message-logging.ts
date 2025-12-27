import {
  createMessageLogRepository,
  messageLogs,
  type Database
} from "@tee-time/database";
import { logger } from "./logger";

export type MessageLogParams = {
  memberId: string;
  direction: (typeof messageLogs)["$inferSelect"]["direction"];
  channel: (typeof messageLogs)["$inferSelect"]["channel"];
  providerMessageId?: string | null;
  bodyRedacted: string;
  bodyHash?: string | null;
  metadata: Record<string, unknown>;
  createdAt?: Date;
};

export const logMessage = async (db: Database, params: MessageLogParams) => {
  const repo = createMessageLogRepository(db);
  const result = await repo.logMessage({
    memberId: params.memberId,
    direction: params.direction,
    channel: params.channel,
    providerMessageId: params.providerMessageId ?? null,
    bodyRedacted: params.bodyRedacted,
    bodyHash: params.bodyHash ?? null,
    metadata: params.metadata,
    createdAt: params.createdAt ?? new Date()
  });
  logger.info("core.messageLog.created", {
    memberId: params.memberId,
    direction: params.direction,
    channel: params.channel,
    providerMessageId: params.providerMessageId ?? null
  });
  return result;
};
