import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { type Database } from "../client";
import { webhookDlq } from "../schema";
import { firstOrNull } from "./utils";

export type WebhookDlqEvent = typeof webhookDlq.$inferSelect;
export type NewWebhookDlqEvent = typeof webhookDlq.$inferInsert;

export const createWebhookDlqRepository = (db: Database) => ({
  create: async (data: NewWebhookDlqEvent): Promise<WebhookDlqEvent> => {
    const rows = await db.insert(webhookDlq).values(data).returning();
    return rows[0] as WebhookDlqEvent;
  },
  getById: async (id: string): Promise<WebhookDlqEvent | null> => {
    const rows = await db.select().from(webhookDlq).where(eq(webhookDlq.id, id));
    return firstOrNull(rows);
  },
  list: async (params?: {
    status?: string;
    provider?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  }): Promise<WebhookDlqEvent[]> => {
    const query = db.select().from(webhookDlq).orderBy(desc(webhookDlq.createdAt));
    const conditions = [];
    if (params?.status) {
      conditions.push(eq(webhookDlq.status, params.status));
    }
    if (params?.provider) {
      conditions.push(eq(webhookDlq.provider, params.provider));
    }
    if (params?.eventType) {
      conditions.push(eq(webhookDlq.eventType, params.eventType));
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
  count: async (params?: {
    status?: string;
    provider?: string;
    eventType?: string;
  }): Promise<number> => {
    const query = db.select({ count: sql<number>`count(*)` }).from(webhookDlq);
    const conditions = [];
    if (params?.status) {
      conditions.push(eq(webhookDlq.status, params.status));
    }
    if (params?.provider) {
      conditions.push(eq(webhookDlq.provider, params.provider));
    }
    if (params?.eventType) {
      conditions.push(eq(webhookDlq.eventType, params.eventType));
    }
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    const rows = await query;
    return Number(rows[0]?.count ?? 0);
  },
  update: async (
    id: string,
    data: Partial<NewWebhookDlqEvent>
  ): Promise<WebhookDlqEvent | null> => {
    const rows = await db
      .update(webhookDlq)
      .set(data)
      .where(eq(webhookDlq.id, id))
      .returning();
    return firstOrNull(rows);
  },
  claimDuePending: async (
    limit: number,
    now = new Date(),
    staleProcessingMinutes = 15
  ): Promise<WebhookDlqEvent[]> => {
    const rows = await db.execute(sql`
      update webhook_dlq
      set status = 'processing',
          attempts = attempts + 1,
          updated_at = ${now}
      where id in (
        select id
        from webhook_dlq
        where (
          status = 'pending'
          and next_retry_at <= ${now}
        )
        or (
          status = 'processing'
          and updated_at <= now() - make_interval(mins => ${staleProcessingMinutes})
        )
        order by next_retry_at asc
        limit ${limit}
        for update skip locked
      )
      returning *;
    `);
    return (rows.rows ?? []) as WebhookDlqEvent[];
  },
  listOldResolved: async (cutoff: Date, limit = 1000): Promise<WebhookDlqEvent[]> => {
    return db
      .select()
      .from(webhookDlq)
      .where(and(eq(webhookDlq.status, "resolved"), lte(webhookDlq.updatedAt, cutoff)))
      .orderBy(asc(webhookDlq.updatedAt))
      .limit(limit);
  },
  deleteByIds: async (ids: string[]): Promise<number> => {
    if (ids.length === 0) return 0;
    const rows = await db
      .delete(webhookDlq)
      .where(inArray(webhookDlq.id, ids))
      .returning({ id: webhookDlq.id });
    return rows.length;
  },
});
