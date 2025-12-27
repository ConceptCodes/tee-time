import { createAuditLogRepository, type Database } from "@tee-time/database";
import { logger } from "./logger";

export type AuditEventParams = {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
};

export const logAuditEvent = async (db: Database, params: AuditEventParams) => {
  const repo = createAuditLogRepository(db);
  const result = await repo.log({
    actorId: params.actorId ?? null,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    metadata: params.metadata ?? {},
    createdAt: params.createdAt ?? new Date()
  });
  logger.info("core.auditLog.created", {
    actorId: params.actorId ?? null,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId
  });
  return result;
};
