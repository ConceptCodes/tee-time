import { getDb } from "../src/client";
import { 
  memberProfiles, 
  bookings, 
  bookingStatusHistory, 
  messageLogs, 
  supportRequests, 
  auditLogs,
  clubs,
  clubLocations,
  staffUsers
} from "../src/schema";
import { faker } from "@faker-js/faker";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("🎲 Generating mock data...");
  const db = getDb();

  // 1. Fetch reference data
  const allClubs = await db.select().from(clubs);
  const allLocations = await db.select().from(clubLocations);
  const allStaff = await db.select().from(staffUsers);

  if (allClubs.length === 0 || allLocations.length === 0) {
    console.error("❌ No clubs or locations found. Please run seed first.");
    process.exit(1);
  }

  // 2. Generate Members
  console.log("👥 Generating 50 members...");
  const memberIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const name = faker.person.fullName();
    const phone = faker.phone.number({ style: 'international' });
    const res = await db.insert(memberProfiles).values({
      name,
      phoneNumber: phone,
      membershipId: `MEM-${faker.string.alphanumeric(6).toUpperCase()}`,
      timezone: faker.helpers.arrayElement(["America/Chicago", "America/New_York", "America/Los_Angeles"]),
      favoriteLocationLabel: faker.helpers.arrayElement(allLocations).name,
      isActive: true,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
    }).returning({ id: memberProfiles.id });
    memberIds.push(res[0].id);
  }

  // 3. Generate Bookings and Status History
  console.log("📅 Generating 500 bookings...");
  const statusOptions = ["Confirmed", "Cancelled", "Not Available", "Pending"] as const;
  const now = new Date();

  // Only use clubs that actually have locations to avoid empty arrays
  const clubsWithLocations = allClubs.filter(club => 
    allLocations.some(loc => loc.clubId === club.id)
  );

  for (let i = 0; i < 500; i++) {
    const memberId = faker.helpers.arrayElement(memberIds);
    const club = faker.helpers.arrayElement(clubsWithLocations);
    const loc = faker.helpers.arrayElement(allLocations.filter(l => l.clubId === club.id));
    
    // Create bookings from 90 days ago to now
    const createdAt = faker.date.between({ 
      from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), 
      to: now 
    });
    
    const status = faker.helpers.weightedArrayElement([
      { weight: 6, value: "Confirmed" },
      { weight: 2, value: "Cancelled" },
      { weight: 1, value: "Not Available" },
      { weight: 1, value: "Pending" },
    ]) as typeof statusOptions[number];

    const preferredDate = new Date(createdAt);
    preferredDate.setDate(preferredDate.getDate() + faker.number.int({ min: 1, max: 14 }));

    const res = await db.insert(bookings).values({
      memberId,
      clubId: club.id,
      clubLocationId: loc.id,
      preferredDate: preferredDate.toISOString().split("T")[0],
      preferredTimeStart: `${faker.number.int({ min: 8, max: 20 })}:00`,
      numberOfPlayers: faker.number.int({ min: 1, max: 6 }),
      guestNames: faker.helpers.maybe(() => `${faker.person.fullName()}, ${faker.person.fullName()}`, { probability: 0.3 }) ?? "",
      notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }) ?? "",
      status,
      bookingReference: `TT-${faker.string.alphanumeric(6).toUpperCase()}`,
      createdAt,
      updatedAt: status === "Pending" ? createdAt : new Date(createdAt.getTime() + faker.number.int({ min: 5, max: 120 }) * 60000),
    }).returning({ id: bookings.id });

    const bookingId = res[0].id;

    // Status History for non-pending
    if (status !== "Pending") {
      const changedAt = new Date(createdAt.getTime() + faker.number.int({ min: 5, max: 120 }) * 60000);
      const staff = allStaff.length > 0 ? faker.helpers.arrayElement(allStaff) : null;

      await db.insert(bookingStatusHistory).values({
        bookingId,
        previousStatus: "Pending",
        nextStatus: status,
        changedByStaffId: staff?.id ?? null,
        reason: faker.helpers.maybe(() => faker.lorem.words(3), { probability: 0.5 }) ?? "Processed",
        createdAt: changedAt,
      });
    }
  }

  // 4. Generate Message Logs
  console.log("💬 Generating 1500 message logs...");
  const flows = ["booking-intake", "faq", "support", "member-onboarding"];

  for (let i = 0; i < 1500; i++) {
    const memberId = faker.helpers.arrayElement(memberIds);
    const direction = faker.helpers.arrayElement(["inbound", "outbound"] as const);
    const createdAt = faker.date.between({ 
      from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), 
      to: now 
    });

    await db.insert(messageLogs).values({
      memberId,
      direction,
      channel: "whatsapp",
      bodyRedacted: faker.lorem.sentence(),
      metadata: {
        agentFlow: faker.helpers.arrayElement(flows),
        aiResponse: direction === "outbound",
        latencyMs: faker.number.int({ min: 500, max: 3000 }),
      },
      createdAt,
    });
  }

  // 5. Generate Support Requests
  console.log("🆘 Generating 30 support requests...");
  for (let i = 0; i < 30; i++) {
    const memberId = faker.helpers.arrayElement(memberIds);
    const createdAt = faker.date.recent({ days: 60 });
    const isResolved = faker.datatype.boolean();

    await db.insert(supportRequests).values({
      memberId,
      message: faker.lorem.paragraph(),
      status: isResolved ? "resolved" : "open",
      createdAt,
      resolvedAt: isResolved ? new Date(createdAt.getTime() + faker.number.int({ min: 1, max: 48 }) * 3600000) : null,
    });
  }

  // 6. Generate Audit Logs
  console.log("📝 Generating 100 audit logs...");
  const actions = ["update_booking", "create_member", "delete_bay", "update_club_metadata"];
  for (let i = 0; i < 100; i++) {
    const staff = faker.helpers.arrayElement(allStaff);
    if (!staff) continue;

    await db.insert(auditLogs).values({
      actorId: staff.id,
      action: faker.helpers.arrayElement(actions),
      resourceType: "booking",
      resourceId: faker.string.uuid() as any,
      metadata: { browser: "Chrome", ip: faker.internet.ip() },
      createdAt: faker.date.recent({ days: 30 }),
    });
  }

  console.log("✨ Mock data generation complete!");
  process.exit(0);
}

main().catch(err => {
  console.error("💥 Error generating mock data:", err);
  process.exit(1);
});
