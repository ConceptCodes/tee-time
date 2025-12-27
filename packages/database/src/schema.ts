import {
  boolean,
  date,
  geometry,
  index,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  vector
} from "drizzle-orm/pg-core";

const geometryPoint = (name: string) =>
  geometry(name, { type: "point", mode: "xy", srid: 4326 });

const parsedFaqEmbeddingDimensions = Number.parseInt(
  process.env.FAQ_EMBEDDING_DIMENSIONS ?? "1536",
  10
);
const FAQ_EMBEDDING_DIMENSIONS =
  Number.isFinite(parsedFaqEmbeddingDimensions) &&
  parsedFaqEmbeddingDimensions > 0
    ? parsedFaqEmbeddingDimensions
    : 1536;

export const bookingStatusEnum = pgEnum("booking_status", [
  "Pending",
  "Confirmed",
  "Not Available",
  "Cancelled",
  "Follow-up required"
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "whatsapp",
  "slack",
  "email"
]);

export const messageDirectionEnum = pgEnum("message_direction", [
  "inbound",
  "outbound"
]);

export const jobTypeEnum = pgEnum("job_type", [
  "reminder",
  "follow_up",
  "retention"
]);

export const staffRoleEnum = pgEnum("staff_role", ["admin", "member"]);

export const memberProfiles = pgTable(
  "member_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phoneNumber: text("phone_number").notNull().unique(),
    name: text("name").notNull(),
    timezone: text("timezone").notNull(),
    favoriteLocationLabel: text("favorite_location_label").notNull(),
    favoriteLocationPoint: geometryPoint("favorite_location_point"),
    membershipId: text("membership_id").notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
  }
);

export const clubs = pgTable("clubs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const clubLocations = pgTable(
  "club_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id),
    name: text("name").notNull(),
    address: text("address").notNull(),
    locationPoint: geometryPoint("location_point").notNull(),
    isActive: boolean("is_active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
  },
  (table) => ({
    clubIdIdx: index("club_locations_club_id_idx").on(table.clubId),
    locationPointIdx: index("club_locations_location_point_gist_idx").using(
      "gist",
      table.locationPoint
    )
  })
);

export const staffUsers = pgTable("staff_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  authUserId: text("auth_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: staffRoleEnum("role").notNull(),
  isActive: boolean("is_active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id),
    clubLocationId: uuid("club_location_id").references(
      () => clubLocations.id
    ),
    preferredDate: date("preferred_date").notNull(),
    preferredTimeStart: time("preferred_time_start").notNull(),
    preferredTimeEnd: time("preferred_time_end"),
    numberOfPlayers: smallint("number_of_players").notNull(),
    guestNames: text("guest_names").notNull(),
    notes: text("notes").notNull(),
    status: bookingStatusEnum("status").notNull(),
    staffMemberId: uuid("staff_member_id").references(() => staffUsers.id),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
  },
  (table) => ({
    statusDateIdx: index("bookings_status_preferred_date_idx").on(
      table.status,
      table.preferredDate
    ),
    memberCreatedIdx: index("bookings_member_id_created_at_idx").on(
      table.memberId,
      table.createdAt
    )
  })
);

export const bookingStatusHistory = pgTable(
  "booking_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    previousStatus: bookingStatusEnum("previous_status").notNull(),
    nextStatus: bookingStatusEnum("next_status").notNull(),
    changedByStaffId: uuid("changed_by_staff_id").references(
      () => staffUsers.id
    ),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull()
  },
  (table) => ({
    bookingCreatedIdx: index("booking_status_history_booking_id_created_at_idx")
      .on(table.bookingId, table.createdAt)
  })
);

export const faqEntries = pgTable(
  "faq_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    tags: jsonb("tags").notNull(),
    embedding: vector("embedding", { dimensions: FAQ_EMBEDDING_DIMENSIONS }),
    embeddingUpdatedAt: timestamp("embedding_updated_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
  },
  (table) => ({
    embeddingIdx: index("faq_entries_embedding_idx").using(
      "ivfflat",
      table.embedding.op("vector_cosine_ops")
    )
  })
);

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const teamMemberships = pgTable("team_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id),
  staffUserId: uuid("staff_user_id")
    .notNull()
    .references(() => staffUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    channel: notificationChannelEnum("channel").notNull(),
    templateName: text("template_name").notNull(),
    providerMessageId: text("provider_message_id"),
    status: text("status").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true })
  },
  (table) => ({
    bookingStatusIdx: index("notifications_booking_id_status_idx").on(
      table.bookingId,
      table.status
    )
  })
);

export const supportRequests = pgTable("support_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => memberProfiles.id),
  message: text("message").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
});

export const scheduledJobs = pgTable("scheduled_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobType: jobTypeEnum("job_type").notNull(),
  bookingId: uuid("booking_id").references(() => bookings.id),
  runAt: timestamp("run_at", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
  attempts: smallint("attempts").notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const messageLogs = pgTable(
  "message_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    direction: messageDirectionEnum("direction").notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    providerMessageId: text("provider_message_id"),
    bodyRedacted: text("body_redacted").notNull(),
    bodyHash: text("body_hash"),
    metadata: jsonb("metadata").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull()
  },
  (table) => ({
    memberCreatedIdx: index("message_logs_member_id_created_at_idx").on(
      table.memberId,
      table.createdAt
    )
  })
);

export const messageDedup = pgTable(
  "message_dedup",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    messageHash: text("message_hash").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
  },
  (table) => ({
    memberHashUnique: uniqueIndex("message_dedup_member_id_message_hash_idx").on(
      table.memberId,
      table.messageHash
    )
  })
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => staffUsers.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: uuid("resource_id").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const schema = {
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
};
