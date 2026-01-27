import type { Database } from "@tee-time/database";
import {
  createBookingRepository,
  createClubRepository,
} from "@tee-time/database";
import { notifyBooking } from "./notifications/slack";
import { setBookingStatusWithHistory } from "./booking-status";
import { logger } from "./logger";

export type CancelBookingParams = {
  bookingId: string;
  memberId: string;
  reason?: string | null;
  staffMemberId?: string | null;
  notify?: boolean;
  now?: Date;
};

export const cancelBookingWithHistory = async (
  db: Database,
  params: CancelBookingParams
) => {
  const now = params.now ?? new Date();
  const result = await setBookingStatusWithHistory(db, {
    bookingId: params.bookingId,
    nextStatus: "Cancelled",
    changedByStaffId: params.staffMemberId ?? null,
    reason: params.reason ?? null,
    cancelledAt: now,
    audit: {
      actorId: params.staffMemberId ?? null,
      action: "booking.cancel",
      metadata: { memberId: params.memberId }
    }
  });

  if (!result.booking) {
    return { booking: null, history: null };
  }

  logger.info("core.booking.cancelled", {
    bookingId: result.booking.id,
    memberId: params.memberId
  });

   if (params.notify) {
     const date = String(result.booking.preferredDate).slice(0, 10);
     const timeWindow = result.booking.preferredTimeEnd
       ? `${result.booking.preferredTimeStart} - ${result.booking.preferredTimeEnd}`
       : result.booking.preferredTimeStart;
     const text =
       `Booking cancelled.\n` +
       `Member: ${params.memberId}\n` +
       `Date: ${date}\n` +
       `Time: ${timeWindow}` +
       (params.reason ? `\nReason: ${params.reason}` : "");
     
     let teamChannel: string | undefined;
     try {
       const clubRepo = createClubRepository(db);
       const clubWithTeam = await clubRepo.getClubWithTeam(result.booking.clubId);
       if (clubWithTeam?.team?.slackChannel) {
         teamChannel = clubWithTeam.team.slackChannel;
       }
     } catch (error) {
       logger.warn("core.booking.teamLookupFailed", {
         bookingId: result.booking.id,
         clubId: result.booking.clubId,
         error: error instanceof Error ? error.message : String(error)
       });
     }
     
     await notifyBooking({ text, teamChannel });
   }

  return result;
};
