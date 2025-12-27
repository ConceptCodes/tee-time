import type { Database } from "@tee-time/database";
import { createAuditLogRepository } from "@tee-time/database";
import { logger } from "../../logger";

export const listAuditLogs = async (
  db: Database,
  params?: { actorId?: string; resourceType?: string; limit?: number; offset?: number }
) => {
  const repo = createAuditLogRepository(db);
  const [result, total] = await Promise.all([
    repo.list(params),
    repo.count({ actorId: params?.actorId, resourceType: params?.resourceType })
  ]);
  logger.info("core.admin.auditLogs.list", {
    count: result.length,
    actorId: params?.actorId ?? null,
    resourceType: params?.resourceType ?? null,
    limit: params?.limit ?? null,
    offset: params?.offset ?? null
  });
  return { data: result, total };
};

export const getAuditLogById = async (db: Database, id: string) => {
  const repo = createAuditLogRepository(db);
  const result = await repo.getById(id);
  logger.info("core.admin.auditLogs.get", { auditLogId: id, found: Boolean(result) });
  return result;
};
