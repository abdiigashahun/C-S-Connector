import { betterAuth } from "better-auth";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // In production you should ensure this is set via env.
  // We throw here so misconfiguration surfaces early.
  throw new Error("DATABASE_URL is not set");
}

export const auth = betterAuth({
  database: new Pool({
    connectionString: databaseUrl,
    max: 10,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    // We store additional info such as role in a separate `users` table in Supabase.
    additionalFields: {},
  },
  session: {},
  advanced: {},
});

