import { getDb } from "../src/client";
import { staffUsers } from "../src/schema";

/**
 * Simple hash function for demo purposes.
 * Note: This is NOT cryptographically secure and should only be used for demo/test data.
 */
export async function simpleHash(text: string): Promise<string> {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export interface DemoUserConfig {
  email: string;
  password: string;
  name: string;
  role: "admin" | "staff";
}

const DEFAULT_DEMO_USERS: DemoUserConfig[] = [
  {
    email: "admin@teetime.com",
    password: "DemoPass123!",
    name: "Demo Admin",
    role: "admin",
  },
  {
    email: "staff@teetime.com",
    password: "DemoPass123!",
    name: "Demo Staff",
    role: "staff",
  },
];

/**
 * Seeds demo staff users into the database.
 * Skips users that already exist.
 */
export async function seedDemoUsers(
  users: DemoUserConfig[] = DEFAULT_DEMO_USERS
): Promise<void> {
  const db = getDb();

  for (const user of users) {
    try {
      const existing = await db.query.staffUsers.findFirst({
        where: (staffUsers, { eq }) => eq(staffUsers.email, user.email),
      });

      if (existing) {
        console.log(`ℹ️ User ${user.email} already exists, skipping...`);
        continue;
      }

      const hash = await simpleHash(user.password);

      await db.insert(staffUsers).values({
        email: user.email,
        passwordHash: hash,
        passwordSalt: "",
        name: user.name,
        role: user.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ Created ${user.role}: ${user.email}`);
    } catch (error) {
      console.error(`❌ Error creating ${user.email}:`, error);
    }
  }

  console.log("\n📋 Demo User Credentials:");
  console.log("------------------------");
  users.forEach((user) => {
    console.log(`${user.role}: ${user.email} / ${user.password}`);
  });
  console.log("------------------------");
  console.log("Login at: http://localhost:5173/login\n");
}

// CLI execution
if (import.meta.main) {
  seedDemoUsers().then(() => process.exit(0));
}
