#!/usr/bin/env bun
import { drizzle } from "drizzle-orm";
import { Pool } from "pg";
import { staffUsers } from "@tee-time/database/schema";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost:5432/tee_time";

async function simpleHash(text: string): Promise<string> {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

async function seedDemoUser() {
  const email = "admin@teetime.com";
  const password = "DemoPass123!";
  const hash = await simpleHash(password);

  const pool = new Pool({ connectionString: DATABASE_URL });
  const drizzleInstance = drizzle(pool, { schema });

  await drizzleInstance.insert(staffUsers).values({
    email,
    passwordHash: hash,
    passwordSalt: "",
    name: "Demo Admin",
    role: "admin",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("Demo user created successfully");
  console.log("Email:", email);
  console.log("Password:", password);
  console.log("Use these credentials to login at http://localhost:5173/login");
}

seedDemoUser();
