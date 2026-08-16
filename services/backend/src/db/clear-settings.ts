/// <reference types="node" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createDb } from "./index";

const backendRoot = fileURLToPath(new URL("../..", import.meta.url));

config({ path: path.join(backendRoot, ".dev.vars") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in .dev.vars");
}

const db = createDb(databaseUrl);

const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

async function clearSettings() {
  const deleted = await db.delete(settings).returning({ id: settings.id });
  console.log(`Deleted ${deleted.length} row(s) from settings`);
}

clearSettings().catch((error: unknown) => {
  console.error("Failed to clear settings:", error);
  process.exit(1);
});
