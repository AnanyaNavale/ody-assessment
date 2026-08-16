/// <reference types="node" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { createDb, customers, menuItems, orders } from "./db";

const backendRoot = fileURLToPath(new URL("..", import.meta.url));

config({ path: path.join(backendRoot, ".dev.vars") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in .dev.vars");
}

const db = createDb(databaseUrl);
const API_URL = "http://localhost:8787/api/orders";

async function testOrder() {
  const [customer] = await db.select().from(customers).limit(1);

  if (!customer) {
    throw new Error("No customers found. Run the seed script first.");
  }

  const availableItems = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.isAvailable, true))
    .limit(3);

  const firstItem = availableItems[0];
  const secondItem = availableItems[1];

  if (!firstItem || !secondItem) {
    throw new Error(
      "Need at least 2 available menu items. Run the seed script first.",
    );
  }

  const payload = {
    customerId: customer.id,
    items: [
      { menuItemId: firstItem.id, quantity: 1 },
      { menuItemId: secondItem.id, quantity: 2 },
    ],
    notes: "Test order",
  };

  console.log("Creating order for customer:", customer.name, customer.id);
  console.log("Items:", firstItem.name, "x1,", secondItem.name, "x2");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body: unknown = await response.json();

  console.log("Response status:", response.status);
  console.log("Response body:", JSON.stringify(body, null, 2));

  if (!response.ok) {
    process.exit(1);
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("id" in body) ||
    typeof body.id !== "string"
  ) {
    throw new Error("Successful response did not include an order id");
  }

  const [createdOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, body.id))
    .limit(1);

  if (!createdOrder) {
    throw new Error(`Order ${body.id} was not found in the database`);
  }

  console.log("Verified order in database:", {
    id: createdOrder.id,
    customerId: createdOrder.customerId,
    status: createdOrder.status,
    subtotal: createdOrder.subtotal,
    tax: createdOrder.tax,
    total: createdOrder.total,
    notes: createdOrder.notes,
  });
}

testOrder().catch((error: unknown) => {
  console.error("test:order failed:", error);
  process.exit(1);
});
