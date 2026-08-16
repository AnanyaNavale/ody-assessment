import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".dev.vars") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .dev.vars");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
