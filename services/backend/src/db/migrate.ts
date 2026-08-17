/// <reference types="node" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const backendRoot = fileURLToPath(new URL("../..", import.meta.url).href);

config({ path: path.join(backendRoot, ".dev.vars") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not set in .dev.vars");
  process.exit(1);
}

const neonUrl: string = databaseUrl;

async function runMigrations() {
  console.log("⏳ Running migrations...");

  const db = drizzle(neon(neonUrl));
  await migrate(db, {
    migrationsFolder: path.join(backendRoot, "drizzle"),
  });

  console.log("✅ Migrations completed");
}

runMigrations().catch((error: unknown) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
