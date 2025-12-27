import type { Database } from "@tee-time/database";
import { createSupportRequestRepository } from "@tee-time/database";
import { logger } from "../../logger";

export const listSupportRequests = async (
  db: Database,
  params?: { status?: string; limit?: number; offset?: number }
) => {
  const repo = createSupportRequestRepository(db);
  const [result, total] = await Promise.all([
    repo.list(params),
    repo.count({ status: params?.status })
  ]);
  logger.info("core.admin.supportRequests.list", {
    count: result.length,
    status: params?.status ?? null,
    limit: params?.limit ?? null,
    offset: params?.offset ?? null
  });
  return { data: result, total };
};

export const resolveSupportRequest = async (db: Database, id: string) => {
  const repo = createSupportRequestRepository(db);
  const result = await repo.resolve(id);
  logger.info("core.admin.supportRequests.resolve", { supportRequestId: id });
  return result;
};
