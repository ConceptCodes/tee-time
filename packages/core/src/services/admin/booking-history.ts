import type { Database } from "@syndicate/database";
import { createBookingStatusHistoryRepository } from "@syndicate/database";
import { logger } from "../../logger";

export const listBookingStatusHistory = async (
  db: Database,
  bookingId: string,
  params?: { limit?: number; offset?: number }
) => {
  const repo = createBookingStatusHistoryRepository(db);
  const [result, total] = await Promise.all([
    repo.listByBookingId(bookingId, params),
    repo.countByBookingId(bookingId)
  ]);
  logger.info("core.admin.bookingHistory.list", {
    bookingId,
    count: result.length
  });
  return { data: result, total };
};
