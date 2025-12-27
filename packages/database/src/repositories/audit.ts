import { and, desc, eq } from "drizzle-orm";
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
});
