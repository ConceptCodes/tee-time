import { relations } from "drizzle-orm";
import {
  auditLogs,
  bookingStatusHistory,
  bookings,
  clubLocations,
  clubs,
  faqEntries,
  memberProfiles,
  messageDedup,
  messageLogs,
  notifications,
  scheduledJobs,
  staffUsers,
  supportRequests,
  teamMemberships,
  teams
} from "./schema";

export const memberProfilesRelations = relations(memberProfiles, ({ many }) => ({
  bookings: many(bookings),
  supportRequests: many(supportRequests),
  messageLogs: many(messageLogs),
  messageDedup: many(messageDedup)
}));

export const clubsRelations = relations(clubs, ({ many }) => ({
  locations: many(clubLocations),
  bookings: many(bookings)
}));

export const clubLocationsRelations = relations(clubLocations, ({ one, many }) => ({
  club: one(clubs, {
    fields: [clubLocations.clubId],
    references: [clubs.id]
  }),
  bookings: many(bookings)
}));

export const staffUsersRelations = relations(staffUsers, ({ many }) => ({
  bookings: many(bookings),
  statusHistory: many(bookingStatusHistory),
  teamMemberships: many(teamMemberships),
  auditLogs: many(auditLogs)
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  member: one(memberProfiles, {
    fields: [bookings.memberId],
    references: [memberProfiles.id]
  }),
  club: one(clubs, {
    fields: [bookings.clubId],
    references: [clubs.id]
  }),
  clubLocation: one(clubLocations, {
    fields: [bookings.clubLocationId],
    references: [clubLocations.id]
  }),
  staffMember: one(staffUsers, {
    fields: [bookings.staffMemberId],
    references: [staffUsers.id]
  }),
  statusHistory: many(bookingStatusHistory),
  notifications: many(notifications),
  scheduledJobs: many(scheduledJobs)
}));

export const bookingStatusHistoryRelations = relations(
  bookingStatusHistory,
  ({ one }) => ({
    booking: one(bookings, {
      fields: [bookingStatusHistory.bookingId],
      references: [bookings.id]
    }),
    changedByStaff: one(staffUsers, {
      fields: [bookingStatusHistory.changedByStaffId],
      references: [staffUsers.id]
    })
  })
);

export const faqEntriesRelations = relations(faqEntries, () => ({}));

export const teamMembershipsRelations = relations(teamMemberships, ({ one }) => ({
  team: one(teams, {
    fields: [teamMemberships.teamId],
    references: [teams.id]
  }),
  staffUser: one(staffUsers, {
    fields: [teamMemberships.staffUserId],
    references: [staffUsers.id]
  })
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  memberships: many(teamMemberships)
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  booking: one(bookings, {
    fields: [notifications.bookingId],
    references: [bookings.id]
  })
}));

export const supportRequestsRelations = relations(supportRequests, ({ one }) => ({
  member: one(memberProfiles, {
    fields: [supportRequests.memberId],
    references: [memberProfiles.id]
  })
}));

export const scheduledJobsRelations = relations(scheduledJobs, ({ one }) => ({
  booking: one(bookings, {
    fields: [scheduledJobs.bookingId],
    references: [bookings.id]
  })
}));

export const messageLogsRelations = relations(messageLogs, ({ one }) => ({
  member: one(memberProfiles, {
    fields: [messageLogs.memberId],
    references: [memberProfiles.id]
  })
}));

export const messageDedupRelations = relations(messageDedup, ({ one }) => ({
  member: one(memberProfiles, {
    fields: [messageDedup.memberId],
    references: [memberProfiles.id]
  })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(staffUsers, {
    fields: [auditLogs.actorId],
    references: [staffUsers.id]
  })
}));
