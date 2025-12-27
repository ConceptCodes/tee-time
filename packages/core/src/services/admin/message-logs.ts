import type { Database } from "@tee-time/database";
import { createMessageLogRepository } from "@tee-time/database";
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
  const [result, total] = await Promise.all([
    repo.list(params),
    repo.count({
      memberId: params?.memberId,
      direction: params?.direction,
      channel: params?.channel
    })
  ]);
  logger.info("core.admin.messageLogs.list", {
    count: result.length,
    memberId: params?.memberId ?? null,
    direction: params?.direction ?? null,
    channel: params?.channel ?? null,
    limit: params?.limit ?? null,
    offset: params?.offset ?? null
  });
  return { data: result, total };
};
