import { z } from "zod";

export const staffSchemas = {
  create: z.object({
    authUserId: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1),
    role: z.enum(["admin", "staff", "member"]),
    isActive: z.boolean().optional()
  }),
  update: z.object({
    email: z.string().email().optional(),
    name: z.string().min(1).optional(),
    role: z.enum(["admin", "staff", "member"]).optional(),
    isActive: z.boolean().optional()
  })
};

export const pointSchema = z.object({
  x: z.number(),
  y: z.number()
});

export const clubLocationSchemas = {
  create: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    locationPoint: pointSchema,
    isActive: z.boolean().optional()
  }),
  update: z.object({
    name: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    locationPoint: pointSchema.optional(),
    isActive: z.boolean().optional()
  })
};

export const memberSchemas = {
  create: z.object({
    phoneNumber: z.string().min(1),
    name: z.string().min(1),
    timezone: z.string().min(1),
    favoriteLocationLabel: z.string().min(1),
    favoriteLocationPoint: pointSchema.optional(),
    preferredLocationLabel: z.string().min(1).optional(),
    preferredTimeOfDay: z.string().min(1).optional(),
    preferredBayLabel: z.string().min(1).optional(),
    membershipId: z.string().min(1).optional(),
    onboardingCompletedAt: z.string().datetime().optional(),
    isActive: z.boolean().optional()
  }),
  update: z.object({
    phoneNumber: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    timezone: z.string().min(1).optional(),
    favoriteLocationLabel: z.string().min(1).optional(),
    favoriteLocationPoint: pointSchema.optional(),
    preferredLocationLabel: z.string().min(1).optional(),
    preferredTimeOfDay: z.string().min(1).optional(),
    preferredBayLabel: z.string().min(1).optional(),
    onboardingCompletedAt: z.string().datetime().optional(),
    isActive: z.boolean().optional()
  })
};

export const meSchemas = {
  update: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional()
  })
};

export const bookingSchemas = {
  create: z.object({
    memberId: z.string().uuid(),
    clubId: z.string().uuid(),
    clubLocationId: z.string().uuid().optional(),
    bayId: z.string().uuid().optional(),
    preferredDate: z.string().date(),
    preferredTimeStart: z.string().min(1),
    preferredTimeEnd: z.string().min(1).optional(),
    numberOfPlayers: z.number().int().min(1).max(4),
    guestNames: z.string().min(1),
    notes: z.string().min(1),
    status: z.enum([
      "Pending",
      "Confirmed",
      "Not Available",
      "Cancelled",
      "Follow-up required"
    ]).optional(),
    staffMemberId: z.string().uuid().optional(),
    cancelledAt: z.string().datetime().optional()
  }),
  update: z.object({
    memberId: z.string().uuid().optional(),
    clubId: z.string().uuid().optional(),
    clubLocationId: z.string().uuid().optional(),
    bayId: z.string().uuid().optional(),
    preferredDate: z.string().date().optional(),
    preferredTimeStart: z.string().min(1).optional(),
    preferredTimeEnd: z.string().min(1).optional(),
    numberOfPlayers: z.number().int().min(1).max(4).optional(),
    guestNames: z.string().min(1).optional(),
    notes: z.string().min(1).optional(),
    status: z.enum([
      "Pending",
      "Confirmed",
      "Not Available",
      "Cancelled",
      "Follow-up required"
    ]).optional(),
    staffMemberId: z.string().uuid().optional(),
    cancelledAt: z.string().datetime().optional()
  }),
  statusChange: z.object({
    reason: z.string().min(1).optional()
  })
};

export const faqSchemas = {
  create: z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
    tags: z.array(z.string()).default([]),
    isActive: z.boolean().optional()
  }),
  update: z.object({
    question: z.string().min(1).optional(),
    answer: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    isActive: z.boolean().optional()
  })
};
