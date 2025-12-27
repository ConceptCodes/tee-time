import type { Database } from "@syndicate/database";
import { createSupportRequestRepository } from "@syndicate/database";
import { logger } from "../../logger";

export const listSupportRequests = async (
  db: Database,
  params?: { status?: string; limit?: number; offset?: number }
) => {
  const repo = createSupportRequestRepository(db);
  const result = await repo.list(params);
  logger.info("core.admin.supportRequests.list", {
    count: result.length,
    status: params?.status ?? null,
    limit: params?.limit ?? null,
    offset: params?.offset ?? null
  });
  return result;
};

export const resolveSupportRequest = async (db: Database, id: string) => {
  const repo = createSupportRequestRepository(db);
  const result = await repo.resolve(id);
  logger.info("core.admin.supportRequests.resolve", { supportRequestId: id });
  return result;
};
