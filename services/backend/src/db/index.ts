import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Helper to create database connection with Cloudflare env
export function createDb(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}

export * from "./schema";
