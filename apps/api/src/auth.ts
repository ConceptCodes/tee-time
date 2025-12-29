import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb, schema } from "@tee-time/database";

const authSecret = process.env.BETTER_AUTH_SECRET;
const authUrl = process.env.BETTER_AUTH_URL;

if (!authSecret) {
  throw new Error("BETTER_AUTH_SECRET is required.");
}

if (!authUrl) {
  throw new Error("BETTER_AUTH_URL is required.");
}

export const auth = betterAuth({
  secret: authSecret,
  baseURL: authUrl,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications
    }
  }),
  emailAndPassword: {
    enabled: true
  },
  trustedOrigins: [process.env.ADMIN_APP_ORIGIN || "http://localhost:5173"]
});
