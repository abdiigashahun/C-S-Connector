import { betterAuth } from "better-auth";
import { Pool } from "pg";
import dns from "node:dns";
import { Agent, setGlobalDispatcher } from "undici";

dns.setDefaultResultOrder("ipv4first");
setGlobalDispatcher(
  new Agent({
    connect: {
      family: 4,
    },
  })
);

const databaseUrl = process.env.DATABASE_URL;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

if (!databaseUrl) {
  // In production you should ensure this is set via env.
  // We throw here so misconfiguration surfaces early.
  throw new Error("DATABASE_URL is not set");
}

const parsedDatabaseUrl = new URL(databaseUrl);
const databaseName = parsedDatabaseUrl.pathname.replace(/^\//, "") || "postgres";

export const auth = betterAuth({
  baseURL: betterAuthUrl,
  database: new Pool({
    host: parsedDatabaseUrl.hostname,
    port: parsedDatabaseUrl.port ? Number(parsedDatabaseUrl.port) : 5432,
    user: decodeURIComponent(parsedDatabaseUrl.username),
    password: decodeURIComponent(parsedDatabaseUrl.password),
    database: databaseName,
    max: 10,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 10_000,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    // We store additional info such as role in a separate `users` table in Supabase.
    additionalFields: {},
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : undefined,
  session: {},
  advanced: {},
});

