import type { Database } from "@syndicate/database";
import { createMessageLogRepository } from "@syndicate/database";
import { logger } from "../../logger";

export const listMessageLogs = async (
  db: Database,
  params?: {
    memberId?: string;
    direction?: "inbound" | "outbound";
    channel?: "whatsapp" | "slack" | "email";
    limit?: number;
    offset?: number;
  }
) => {
  const repo = createMessageLogRepository(db);
  const result = await repo.list(params);
  logger.info("core.admin.messageLogs.list", {
    count: result.length,
    memberId: params?.memberId ?? null,
    direction: params?.direction ?? null,
    channel: params?.channel ?? null,
    limit: params?.limit ?? null,
    offset: params?.offset ?? null
  });
  return result;
};
