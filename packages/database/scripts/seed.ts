import { getDb } from "../src/client";
import { createClubRepository } from "../src/repositories/clubs";
import { createClubLocationRepository } from "../src/repositories/clubs";
import { createClubLocationBayRepository } from "../src/repositories/bays";
import { createFaqRepository } from "../src/repositories/faqs";
import { createMemberRepository } from "../src/repositories/members";
import { createBookingRepository } from "../src/repositories/bookings";
import { config } from "dotenv";
import path from "node:path";
import { clubs, bookings, bookingStatusHistory } from "../src/schema";
import { eq } from "drizzle-orm";

// Load environment variables
config({ path: path.join(__dirname, "../../../.env") });

async function main() {
  console.log("🌱 Seeding database...");

  const db = getDb();
  
  // -- Repositories --
  const clubRepo = createClubRepository(db);
  const locationRepo = createClubLocationRepository(db);
  const bayRepo = createClubLocationBayRepository(db);
  const faqRepo = createFaqRepository(db);
  const memberRepo = createMemberRepository(db);
  const bookingRepo = createBookingRepository(db);

  // -- 1. Clubs --
  console.log("Creating clubs...");
  const clubData = [
    { name: "Topgolf", isActive: true },
    { name: "Drive Shack", isActive: true },
    { name: "Puttery", isActive: true },
    { name: "PopStroke", isActive: true },
  ];

  for (const c of clubData) {
    const existing = await db.query.clubs.findFirst({
        where: eq(clubs.name, c.name)
    });
    if (!existing) {
        await clubRepo.create({ ...c, createdAt: new Date(), updatedAt: new Date() });
        console.log(`  + ${c.name}`);
    } else {
        console.log(`  . ${c.name} (exists)`);
    }
  }

  // Refetch clubs to get IDs
  const allClubs = await clubRepo.listActive();
  const topgolf = allClubs.find(c => c.name === "Topgolf");
  const driveShack = allClubs.find(c => c.name === "Drive Shack");
  const puttery = allClubs.find(c => c.name === "Puttery");

  // -- 2. Locations --
  console.log("Creating locations...");
  const locationData: { clubId: string | undefined, name: string }[] = [
    { clubId: topgolf?.id, name: "Dallas" },
    { clubId: topgolf?.id, name: "Austin" },
    { clubId: topgolf?.id, name: "The Colony" },
    { clubId: driveShack?.id, name: "Frisco" },
    { clubId: puttery?.id, name: "The Colony" },
    { clubId: puttery?.id, name: "Houston" },
  ];

  for (const l of locationData) {
    if (!l.clubId) continue;
    
    const existing = await locationRepo.listActiveByClubId(l.clubId);
    if (!existing.find(ex => ex.name === l.name)) {
        const loc = await locationRepo.create({
            clubId: l.clubId,
            name: l.name,
            address: "123 Test St",
            isActive: true,
            locationPoint: { x: 0, y: 0 },
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log(`  + ${l.name}`);
        
        // -- 3. Bays --
        console.log(`    Creating bays for ${l.name}...`);
        for (let i = 1; i <= 5; i++) {
             await bayRepo.create({
                 clubLocationId: loc.id,
                 name: `Bay ${i}`,
                 status: "available",
                 createdAt: new Date(),
                 updatedAt: new Date()
             });
        }
    } else {
        console.log(`  . ${l.name} (exists)`);
    }
  }

  // -- 4. FAQs --
  console.log("Creating FAQs...");
  const faqData = [
    { question: "What is the cancellation policy?", answer: "You can cancel up to 24 hours before your tee time for a full refund." },
    { question: "Is there a dress code?", answer: "We recommend casual golf attire. No gym shorts or cutoffs." },
    { question: "Can I bring my own clubs?", answer: "Yes, you are welcome to bring your own clubs, or use our complimentary rentals." },
    { question: "How many people per bay?", answer: "Each bay can accommodate up to 6 players." },
  ];

  // Check count to prevent duplicate seeding
  const count = await faqRepo.countActive();
  if (count < faqData.length) {
     for (const f of faqData) {
         await faqRepo.create({
             ...f,
             tags: ["general"],
             isActive: true,
             createdAt: new Date(),
             updatedAt: new Date()
         });
         console.log(`  + ${f.question}`);
      }
  }

  // -- 5. Members --
  console.log("Creating Test Member...");
  const TEST_PHONE = "+15550009999";
  let member = await memberRepo.getByPhoneNumber(TEST_PHONE);
  if (!member) {
      member = await memberRepo.create({
          phoneNumber: TEST_PHONE,
          name: "Seed User",
          membershipId: "SEED-001",
          timezone: "America/Chicago",
          favoriteLocationLabel: "Topgolf Dallas",
          createdAt: new Date(),
          updatedAt: new Date(),
      });
      console.log(`  + Seed User (${member.id})`);
  } else {
      console.log(`  . Seed User (exists)`);
  }

  // -- 6. Bookings (Mock Report Data) --
  // Generate some random bookings for last month
  if (member && topgolf) {
      console.log("Generating status report data...");
      const locations = await locationRepo.listActiveByClubId(topgolf.id);
      if (locations.length > 0) {
          const loc = locations[0];
          
          const existingBookings = await bookingRepo.listByMemberId(member.id);
          if (existingBookings.length < 5) {
              
              const statuses = ["Confirmed", "Cancelled", "Confirmed", "Not Available", "Pending"];
              const now = new Date();
              
              for (let i = 0; i < 5; i++) {
                  const dateVal = new Date(now);
                  dateVal.setDate(dateVal.getDate() - (i * 2)); 
                  
                  const bookingFn = await bookingRepo.create({
                      memberId: member.id,
                      clubId: topgolf.id,
                      clubLocationId: loc.id,
                      bayId: null,
                      preferredDate: dateVal.toISOString().split("T")[0],
                      preferredTimeStart: "14:00",
                      numberOfPlayers: 4,
                      guestNames: "",
                      notes: "",
                      status: "Pending", // Start Pending
                      createdAt: dateVal,
                      updatedAt: dateVal
                  });

                  // Update status to simulate history
                  const status = statuses[i];
                  if (status !== "Pending") {
                      await db.update(bookings)
                        .set({ status: status as any, updatedAt: new Date(dateVal.getTime() + 1000 * 60 * 30) })
                        .where(eq(bookings.id, bookingFn.id));

                      // Insert history
                      await db.insert(bookingStatusHistory).values({
                          bookingId: bookingFn.id,
                          previousStatus: "Pending",
                          nextStatus: status as any,
                          changedBy: "system", // assuming simplified logging
                          createdAt: new Date(dateVal.getTime() + 1000 * 60 * 30)
                      });
                  }
                  console.log(`  + Booking (${status})`);
              }
          }
      }
  }

  console.log("✅ Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
