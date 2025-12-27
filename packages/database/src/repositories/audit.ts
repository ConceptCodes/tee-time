import { and, desc, eq, sql } from "drizzle-orm";
import { type Database } from "../client";
import { auditLogs } from "../schema";
import { firstOrNull } from "./utils";

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export const createAuditLogRepository = (db: Database) => ({
  create: async (data: NewAuditLog): Promise<AuditLog> => {
    const rows = await db.insert(auditLogs).values(data).returning();
    return rows[0] as AuditLog;
  },
  log: async (
    data: Omit<NewAuditLog, "createdAt"> & { createdAt?: Date }
  ): Promise<AuditLog> => {
    const rows = await db
      .insert(auditLogs)
      .values({
        ...data,
        createdAt: data.createdAt ?? new Date()
      })
      .returning();
    return rows[0] as AuditLog;
  },
  getById: async (id: string): Promise<AuditLog | null> => {
    const rows = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
    return firstOrNull(rows);
  },
  listByResource: async (
    resourceType: string,
    resourceId: string
  ): Promise<AuditLog[]> => {
    return db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceType, resourceType),
          eq(auditLogs.resourceId, resourceId)
        )
      )
      .orderBy(desc(auditLogs.createdAt));
  },
  list: async (params?: {
    actorId?: string;
    resourceType?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> => {
    const query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
    const conditions = [];
    if (params?.actorId) {
      conditions.push(eq(auditLogs.actorId, params.actorId));
    }
    if (params?.resourceType) {
      conditions.push(eq(auditLogs.resourceType, params.resourceType));
    }
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    if (params?.limit) {
      query.limit(params.limit);
    }
    if (params?.offset) {
      query.offset(params.offset);
    }
    return query;
  },
  count: async (params?: { actorId?: string; resourceType?: string }): Promise<number> => {
    const query = db.select({ count: sql<number>`count(*)` }).from(auditLogs);
    const conditions = [];
    if (params?.actorId) {
      conditions.push(eq(auditLogs.actorId, params.actorId));
    }
    if (params?.resourceType) {
      conditions.push(eq(auditLogs.resourceType, params.resourceType));
    }
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    const rows = await query;
    return Number(rows[0]?.count ?? 0);
  },
});
