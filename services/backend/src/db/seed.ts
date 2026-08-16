/// <reference types="node" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import {
  createDb,
  customers,
  insertCustomerSchema,
  insertMenuItemDietaryTagSchema,
  insertOrderItemSchema,
  insertOrderSchema,
  insertRestaurantSettingsSchema,
  menuItemDietaryTags,
  menuItems,
  orderItems,
  orders,
  restaurantSettings,
  type DietaryTag,
  type OrderStatus,
} from "./index";

const backendRoot = fileURLToPath(new URL("../..", import.meta.url));

config({ path: path.join(backendRoot, ".dev.vars") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in .dev.vars");
}

const db = createDb(databaseUrl);

const TAX_RATE = 0.08;
const ORDER_COUNT = 28;

const customerSeeds = [
  {
    name: "Maya Patel",
    email: "maya.patel@gmail.com",
    phone: "415-555-0142",
  },
  {
    name: "Jordan Lee",
    email: "jordan.lee@icloud.com",
    phone: "510-555-0198",
  },
  {
    name: "Sofia Alvarez",
    email: "sofia.alvarez@gmail.com",
    phone: "628-555-0117",
  },
  {
    name: "Noah Kim",
    email: "noah.kim@outlook.com",
    phone: "925-555-0164",
  },
  {
    name: "Avery Chen",
    email: "avery.chen@icloud.com",
    phone: "408-555-0133",
  },
  {
    name: "Liam O'Connor",
    email: "liam.oconnor@gmail.com",
    phone: "650-555-0180",
  },
  {
    name: "Priya Shah",
    email: "priya.shah@yahoo.com",
    phone: "415-555-0176",
  },
  {
    name: "Ethan Brooks",
    email: "ethan.brooks@icloud.com",
    phone: "510-555-0129",
  },
  {
    name: "Harper Nguyen",
    email: "harper.nguyen@gmail.com",
    phone: "669-555-0155",
  },
  {
    name: "Diego Morales",
    email: "diego.morales@outlook.com",
    phone: "831-555-0104",
  },
  {
    name: "Chloe Bennett",
    email: "chloe.bennett@icloud.com",
    phone: "707-555-0191",
  },
  {
    name: "Owen Park",
    email: "owen.park@gmail.com",
    phone: "925-555-0122",
  },
];

const orderNotes = [
  "Please call when ready",
  "Delivery to back door",
  "Extra napkins please",
  "Leave at the host stand",
  "Birthday dessert — add a candle",
  "Allergy: shellfish",
];

const itemNotes = [
  "no onions",
  "extra sauce",
  "gluten free",
  "no ice",
  "well done",
  "sauce on the side",
  "no cilantro",
];

function money(value: number): string {
  return value.toFixed(2);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(items: T[]): T {
  const item = items[randomInt(0, items.length - 1)];

  if (item === undefined) {
    throw new Error("Cannot pick from an empty list");
  }

  return item;
}

function pickN<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function maybe<T>(value: T, probability: number): T | null {
  return Math.random() < probability ? value : null;
}

function randomStatus(): OrderStatus {
  const roll = Math.random();

  if (roll < 0.6) {
    return "completed";
  }

  if (roll < 0.8) {
    return "preparing";
  }

  if (roll < 0.9) {
    return "ready";
  }

  if (roll < 0.98) {
    return "pending";
  }

  return "cancelled";
}

function randomRecentDate(): Date {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return new Date(now - Math.random() * thirtyDaysMs);
}

const menuItemDetails: Record<
  string,
  { ingredients: string; tags: DietaryTag[] }
> = {
  "Truffle Parmesan Fries": {
    ingredients:
      "potatoes, truffle oil, parmesan, chives, salt, black pepper",
    tags: ["vegetarian", "nut_free"],
  },
  "Caesar Salad": {
    ingredients:
      "romaine lettuce, parmesan, garlic croutons, olive oil, lemon, anchovy",
    tags: ["nut_free", "gluten_free"],
  },
  "Classic Cheeseburger": {
    ingredients:
      "beef patty, cheddar, lettuce, tomato, pickle, onion, brioche bun, special sauce",
    tags: ["nut_free", "spicy"],
  },
  "Herb Roasted Chicken": {
    ingredients:
      "chicken, rosemary, lemon, garlic, olive oil, seasonal vegetables, pan jus",
    tags: ["gluten_free", "nut_free", "dairy_free"],
  },
  "Grilled Salmon": {
    ingredients:
      "atlantic salmon, citrus, butter, asparagus, herbed rice, salt, pepper",
    tags: ["gluten_free", "nut_free", "spicy"],
  },
  "Chocolate Lava Cake": {
    ingredients:
      "dark chocolate, butter, eggs, sugar, flour, vanilla ice cream, raspberry",
    tags: ["vegetarian", "nut_free"],
  },
  "New York Cheesecake": {
    ingredients:
      "cream cheese, graham cracker crust, sugar, eggs, vanilla, blueberry compote",
    tags: ["vegetarian", "nut_free"],
  },
  "Sparkling Citrus Spritz": {
    ingredients: "sparkling water, orange, grapefruit, mint, simple syrup",
    tags: ["vegan", "gluten_free", "dairy_free", "nut_free"],
  },
  "Cold Brew Affogato": {
    ingredients: "vanilla gelato, cold brew coffee, cocoa nibs",
    tags: ["vegetarian", "gluten_free", "nut_free"],
  },
};

function detailsForMenuItem(name: string): {
  ingredients: string;
  tags: DietaryTag[];
} {
  return (
    menuItemDetails[name] ?? {
      ingredients: "house ingredients",
      tags: ["nut_free"],
    }
  );
}

async function seedMenuItemDetails() {
  const existingMenuItems = await db.select().from(menuItems);
  let taggedCount = 0;

  for (const item of existingMenuItems) {
    const details = detailsForMenuItem(item.name);

    await db
      .update(menuItems)
      .set({ ingredients: details.ingredients, updatedAt: new Date() })
      .where(eq(menuItems.id, item.id));

    if (details.tags.length === 0) {
      continue;
    }

    await db.insert(menuItemDietaryTags).values(
      details.tags.map((tag) =>
        insertMenuItemDietaryTagSchema.parse({
          menuItemId: item.id,
          tag,
        }),
      ),
    );

    taggedCount += details.tags.length;
  }

  console.log(
    `Updated ingredients on ${existingMenuItems.length} menu items and added ${taggedCount} dietary tags`,
  );
}

async function seed() {
  console.log("Seeding restaurant order data...");

  console.log("Clearing existing data...");
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(customers);
  await db.delete(menuItemDietaryTags);
  await db.delete(restaurantSettings);
  console.log("Existing data cleared");

  const existingMenuItems = await db.select().from(menuItems);

  if (existingMenuItems.length < 2) {
    throw new Error(
      "Seed requires at least 2 menu items in the database. Seed the menu first.",
    );
  }

  await seedMenuItemDetails();

  const insertedCustomers = await db
    .insert(customers)
    .values(customerSeeds.map((customer) => insertCustomerSchema.parse(customer)))
    .returning();

  console.log(`Created ${insertedCustomers.length} customers`);

  let createdOrderCount = 0;
  let createdItemCount = 0;

  for (let index = 0; index < ORDER_COUNT; index += 1) {
    const customer = pickOne(insertedCustomers);
    const selectedItems = pickN(existingMenuItems, randomInt(2, 5));
    const createdAt = randomRecentDate();
    const lineItems = selectedItems.map((menuItem) => {
      const quantity = randomInt(1, 3);
      const priceAtTime = Number(menuItem.price);
      const subtotal = priceAtTime * quantity;

      return {
        menuItemId: menuItem.id,
        quantity,
        priceAtTime: money(priceAtTime),
        subtotal: money(subtotal),
        notes: maybe(pickOne(itemNotes), 0.3),
      };
    });

    const subtotal = lineItems.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0,
    );
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    const [order] = await db
      .insert(orders)
      .values(
        insertOrderSchema.parse({
          customerId: customer.id,
          status: randomStatus(),
          subtotal: money(subtotal),
          tax: money(tax),
          total: money(total),
          notes: maybe(pickOne(orderNotes), 0.4),
          createdAt,
          updatedAt: createdAt,
        }),
      )
      .returning();

    if (!order) {
      throw new Error("Failed to insert order");
    }

    await db.insert(orderItems).values(
      lineItems.map((item) =>
        insertOrderItemSchema.parse({
          orderId: order.id,
          ...item,
        }),
      ),
    );

    createdOrderCount += 1;
    createdItemCount += lineItems.length;
  }

  console.log(
    `Created ${createdOrderCount} orders with ${createdItemCount} items`,
  );

  for (const customer of insertedCustomers) {
    const customerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customer.id));

    const totalSpent = customerOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );

    await db
      .update(customers)
      .set({
        totalOrders: customerOrders.length,
        totalSpent: money(totalSpent),
      })
      .where(eq(customers.id, customer.id));
  }

  console.log("Updated customer totals");

  await db.insert(restaurantSettings).values(
    insertRestaurantSettingsSchema.parse({
      prepTimeMinutes: 15,
      autoAcceptOrders: true,
      serviceAvailable: true,
      taxRate: "0.0800",
      openingTime: "09:00",
      closingTime: "22:00",
    }),
  );

  console.log("Created restaurant settings");
  console.log("Seed complete.");
}

seed().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
