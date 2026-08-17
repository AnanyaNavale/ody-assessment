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
  type OrderType,
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
const HISTORICAL_ORDER_COUNT = 28;
const RESTAURANT_TIME_ZONE = "America/Los_Angeles";

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

function restaurantNowParts(): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  return zonedParts(new Date());
}

function zonedParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: RESTAURANT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute"),
    read("second"),
  );

  return asUtc - date.getTime();
}

function zonedDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = new Date(utcGuess);

  for (let index = 0; index < 3; index += 1) {
    const offset = getTimeZoneOffsetMs(instant, RESTAURANT_TIME_ZONE);
    instant = new Date(utcGuess - offset);
  }

  return instant;
}

function randomHistoricalDate(): Date {
  const today = restaurantNowParts();
  const daysAgo = randomInt(1, 30);
  const historical = zonedDate(
    today.year,
    today.month,
    today.day,
    randomInt(7, 22),
    randomInt(0, 59),
    randomInt(0, 59),
  );

  return new Date(historical.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

function pickWeightedHour(weights: Record<number, number>): number {
  const entries = Object.entries(weights).map(
    ([hour, weight]) => [Number(hour), weight] as const,
  );
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [hour, weight] of entries) {
    roll -= weight;

    if (roll <= 0) {
      return hour;
    }
  }

  return entries[entries.length - 1]?.[0] ?? 12;
}

function todayDateAt(hour: number): Date {
  const today = restaurantNowParts();

  return zonedDate(
    today.year,
    today.month,
    today.day,
    hour,
    randomInt(0, 59),
    randomInt(0, 59),
  );
}

const PREP_TIME_MINUTES = 15;

function completedAtFor(createdAt: Date): Date {
  const completedAt = new Date(
    createdAt.getTime() + PREP_TIME_MINUTES * 60 * 1000,
  );
  const createdParts = zonedParts(createdAt);
  const completedParts = zonedParts(completedAt);
  const sameLocalDay =
    createdParts.year === completedParts.year &&
    createdParts.month === completedParts.month &&
    createdParts.day === completedParts.day;

  if (sameLocalDay && completedAt.getTime() > createdAt.getTime()) {
    return completedAt;
  }

  const endOfLocalDay = zonedDate(
    createdParts.year,
    createdParts.month,
    createdParts.day,
    23,
    59,
    59,
  );

  if (endOfLocalDay.getTime() > createdAt.getTime()) {
    return endOfLocalDay;
  }

  return new Date(createdAt.getTime() + 60 * 1000);
}

type Daypart =
  | "breakfast"
  | "lunch"
  | "afternoon"
  | "dinner"
  | "late_night";

function randomOrderTypeForDaypart(daypart: Daypart): OrderType {
  const roll = Math.random();

  if (daypart === "breakfast") {
    if (roll < 0.45) {
      return "pickup";
    }

    if (roll < 0.85) {
      return "dine_in";
    }

    return "delivery";
  }

  if (daypart === "lunch") {
    if (roll < 0.4) {
      return "dine_in";
    }

    if (roll < 0.75) {
      return "pickup";
    }

    return "delivery";
  }

  if (daypart === "afternoon") {
    if (roll < 0.35) {
      return "dine_in";
    }

    if (roll < 0.8) {
      return "pickup";
    }

    return "delivery";
  }

  if (daypart === "dinner") {
    if (roll < 0.5) {
      return "dine_in";
    }

    if (roll < 0.75) {
      return "pickup";
    }

    return "delivery";
  }

  if (roll < 0.25) {
    return "dine_in";
  }

  if (roll < 0.55) {
    return "pickup";
  }

  return "delivery";
}

function statusForTodayOrder(createdAt: Date): OrderStatus {
  const ageMs = Date.now() - createdAt.getTime();

  if (ageMs < 0) {
    return Math.random() < 0.7 ? "pending" : "preparing";
  }

  if (ageMs < 20 * 60 * 1000) {
    return Math.random() < 0.7 ? "pending" : "preparing";
  }

  if (ageMs < 45 * 60 * 1000) {
    return Math.random() < 0.65 ? "preparing" : "ready";
  }

  if (ageMs < 2 * 60 * 60 * 1000) {
    if (Math.random() < 0.08) {
      return "cancelled";
    }

    return Math.random() < 0.45 ? "ready" : "completed";
  }

  if (Math.random() < 0.04) {
    return "cancelled";
  }

  return "completed";
}

const menuItemDetails: Record<
  string,
  { ingredients: string; tags: DietaryTag[]; imageUrl: string }
> = {
  "Herb Roasted Chicken": {
    ingredients:
      "chicken, rosemary, lemon, garlic, olive oil, seasonal vegetables, pan jus",
    tags: ["gluten_free", "nut_free", "dairy_free"],
    imageUrl:
      "https://images.unsplash.com/photo-1504670813815-f43e2383e08d?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  "Truffle Parmesan Fries": {
    ingredients:
      "potatoes, truffle oil, parmesan, chives, salt, black pepper",
    tags: ["vegetarian", "nut_free"],
    imageUrl:
      "https://images.unsplash.com/photo-1682117650826-881357860ec9?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  "Classic Cheeseburger": {
    ingredients:
      "beef patty, cheddar, lettuce, tomato, pickle, onion, brioche bun, special sauce",
    tags: ["nut_free", "spicy"],
    imageUrl:
      "https://images.unsplash.com/photo-1703219338500-90f646e60c1b?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  "Caesar Salad": {
    ingredients:
      "romaine lettuce, parmesan, garlic croutons, olive oil, lemon, anchovy",
    tags: ["nut_free", "gluten_free"],
    imageUrl:
      "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  "New York Cheesecake": {
    ingredients:
      "cream cheese, graham cracker crust, sugar, eggs, vanilla, blueberry compote",
    tags: ["vegetarian", "nut_free"],
    imageUrl:
      "https://images.unsplash.com/photo-1681725271035-7270a7464f5b?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  "Chocolate Lava Cake": {
    ingredients:
      "dark chocolate, butter, eggs, sugar, flour, vanilla ice cream, raspberry",
    tags: ["vegetarian", "nut_free"],
    imageUrl:
      "https://images.unsplash.com/photo-1673551490812-eaee2e9bf0ef?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  "Grilled Salmon": {
    ingredients:
      "atlantic salmon, citrus, butter, asparagus, herbed rice, salt, pepper",
    tags: ["gluten_free", "nut_free", "spicy"],
    imageUrl:
      "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  "Sparkling Citrus Spritz": {
    ingredients: "sparkling water, orange, grapefruit, mint, simple syrup",
    tags: ["vegan", "gluten_free", "dairy_free", "nut_free"],
    imageUrl:
      "https://images.unsplash.com/photo-1654074518426-7ef871efccce?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  "Cold Brew Affogato": {
    ingredients: "vanilla gelato, cold brew coffee, cocoa nibs",
    tags: ["vegetarian", "gluten_free", "nut_free"],
    imageUrl:
      "https://images.unsplash.com/photo-1642647390911-77934bc6bc33?q=80&w=1772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
};

function detailsForMenuItem(name: string): {
  ingredients: string;
  tags: DietaryTag[];
  imageUrl: string | null;
} {
  return (
    menuItemDetails[name] ?? {
      ingredients: "house ingredients",
      tags: ["nut_free"],
      imageUrl: null,
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
      .set({
        ingredients: details.ingredients,
        imageUrl: details.imageUrl,
        updatedAt: new Date(),
      })
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

  async function createOrderForCustomer({
    customerId,
    createdAt,
    status,
    orderType,
  }: {
    customerId: string;
    createdAt: Date;
    status: OrderStatus;
    orderType: OrderType;
  }) {
    const selectedItems = pickN(existingMenuItems, randomInt(2, 5));
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
    const completedAt = status === "completed" ? completedAtFor(createdAt) : null;

    const [order] = await db
      .insert(orders)
      .values(
        insertOrderSchema.parse({
          customerId,
          status,
          orderType,
          subtotal: money(subtotal),
          tax: money(tax),
          total: money(total),
          notes: maybe(pickOne(orderNotes), 0.4),
          createdAt,
          completedAt,
          updatedAt: completedAt ?? createdAt,
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

  for (const customer of insertedCustomers) {
    await createOrderForCustomer({
      customerId: customer.id,
      createdAt: randomHistoricalDate(),
      status: randomStatus(),
      orderType: pickOne<OrderType>(["dine_in", "pickup", "delivery"]),
    });
  }

  const extraHistoricalCount = Math.max(
    0,
    HISTORICAL_ORDER_COUNT - insertedCustomers.length,
  );

  for (let index = 0; index < extraHistoricalCount; index += 1) {
    await createOrderForCustomer({
      customerId: pickOne(insertedCustomers).id,
      createdAt: randomHistoricalDate(),
      status: randomStatus(),
      orderType: pickOne<OrderType>(["dine_in", "pickup", "delivery"]),
    });
  }

  const todayWindows: Array<{
    daypart: Daypart;
    count: number;
    hours: Record<number, number>;
  }> = [
    {
      daypart: "breakfast",
      count: randomInt(15, 20),
      hours: { 7: 3, 8: 5, 9: 2 },
    },
    {
      daypart: "lunch",
      count: randomInt(25, 30),
      hours: { 11: 2, 12: 5, 13: 3 },
    },
    {
      daypart: "afternoon",
      count: randomInt(5, 8),
      hours: { 14: 4, 15: 3, 16: 2 },
    },
    {
      daypart: "dinner",
      count: randomInt(25, 30),
      hours: { 18: 2, 19: 5, 20: 2 },
    },
    {
      daypart: "late_night",
      count: randomInt(5, 10),
      hours: { 21: 6, 22: 4 },
    },
  ];

  let todayOrderCount = 0;

  for (const window of todayWindows) {
    for (let index = 0; index < window.count; index += 1) {
      const createdAt = todayDateAt(pickWeightedHour(window.hours));

      await createOrderForCustomer({
        customerId: pickOne(insertedCustomers).id,
        createdAt,
        status: statusForTodayOrder(createdAt),
        orderType: randomOrderTypeForDaypart(window.daypart),
      });
    }

    todayOrderCount += window.count;
  }

  console.log(
    `Created ${createdOrderCount} orders with ${createdItemCount} items (${todayOrderCount} today)`,
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
      restaurantName: "Ody Restaurant",
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
