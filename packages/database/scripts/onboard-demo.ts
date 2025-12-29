import { getDb } from "../src/client";
import {  staffUsers } from "../src/schema";
import { eq } from "drizzle-orm";
import { auth } from "../../../apps/api/src/auth";

async function onboard() {
  const demoUsers = [
    {
      email: "admin@tee-time.com",
      password: process.env.DEMO_PASSWORD,
      name: "Admin User",
      role: "admin" as const,
    },
    {
      email: "staff@tee-time.com",
      password: process.env.DEMO_PASSWORD,
      name: "Staff User",
      role: "staff" as const,
    },
  ];

  console.log("🚀 Onboarding demo users...");

  for (const user of demoUsers) {
    try {
      // 1. Create Better Auth user
      console.log(`Creating user: ${user.email}`);
      const res = await auth.api.signUpEmail({
        body: {
          email: user.email,
          password: user.password,
          name: user.name,
        }
      });

      if (!res) {
        console.log(`User ${user.email} already exists or failed to create.`);
        continue;
      }

      const authUser = res.user;

      // 2. Link to staff_users table
      const db = getDb();
      const existingStaff = await db.query.staffUsers.findFirst({
        where: eq(staffUsers.email, user.email),
      });

      if (!existingStaff) {
        await db.insert(staffUsers).values({
          authUserId: authUser.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Onboarded ${user.name} as ${user.role}`);
      } else {
        console.log(`ℹ️ Staff entry already exists for ${user.email}`);
      }
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log(`ℹ️ User ${user.email} already exists.`);
      } else {
        console.error(`❌ Error onboarding ${user.name}:`, error.message);
      }
    }
  }

  console.log("✨ Onboarding complete!");
  process.exit(0);
}

onboard().catch((err) => {
  console.error("💥 Critical error:", err);
  process.exit(1);
});
