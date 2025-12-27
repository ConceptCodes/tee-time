import type { Database } from "@syndicate/database";
import { createBookingStatusHistoryRepository } from "@syndicate/database";
import { logger } from "../../logger";

export const listBookingStatusHistory = async (db: Database, bookingId: string) => {
  const repo = createBookingStatusHistoryRepository(db);
  const result = await repo.listByBookingId(bookingId);
  logger.info("core.admin.bookingHistory.list", {
    bookingId,
    count: result.length
  });
  return result;
};
