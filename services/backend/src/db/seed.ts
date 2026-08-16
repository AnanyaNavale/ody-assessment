/// <reference types="node" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createDb } from "./index";
import { categories, menuItems } from "./schema";

const backendRoot = fileURLToPath(new URL("../..", import.meta.url));

config({ path: path.join(backendRoot, ".dev.vars") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in .dev.vars");
}

const db = createDb(databaseUrl);

function requireCategoryId(
  inserted: { id: string; name: string }[],
  name: string,
): string {
  const category = inserted.find((entry) => entry.name === name);

  if (!category) {
    throw new Error(`Seed failed: category "${name}" was not inserted`);
  }

  return category.id;
}

async function seed() {
  console.log("Seeding restaurant menu data...");

  const insertedCategories = await db
    .insert(categories)
    .values([
      { name: "Appetizers", displayOrder: 0 },
      { name: "Mains", displayOrder: 1 },
      { name: "Desserts", displayOrder: 2 },
      { name: "Beverages", displayOrder: 3 },
    ])
    .returning();

  console.log(`Inserted ${insertedCategories.length} categories:`);
  for (const category of insertedCategories) {
    console.log(`  - ${category.name} (${category.id})`);
  }

  const appetizersId = requireCategoryId(insertedCategories, "Appetizers");
  const mainsId = requireCategoryId(insertedCategories, "Mains");
  const dessertsId = requireCategoryId(insertedCategories, "Desserts");
  const beveragesId = requireCategoryId(insertedCategories, "Beverages");

  const insertedMenuItems = await db
    .insert(menuItems)
    .values([
      {
        categoryId: appetizersId,
        name: "Truffle Parmesan Fries",
        description:
          "Crispy shoestring fries tossed with truffle oil, parmesan, and chives.",
        price: "9.99",
        isAvailable: true,
        stockQuantity: 12,
        imageUrl: "https://picsum.photos/seed/truffle-fries/800/600",
      },
      {
        categoryId: appetizersId,
        name: "Caesar Salad",
        description:
          "Romaine, shaved parmesan, garlic croutons, and house Caesar dressing.",
        price: "11.49",
        isAvailable: true,
        stockQuantity: null,
        imageUrl: "https://picsum.photos/seed/caesar-salad/800/600",
      },
      {
        categoryId: mainsId,
        name: "Classic Cheeseburger",
        description:
          "Griddled beef patty, cheddar, lettuce, tomato, pickle, and special sauce on a brioche bun.",
        price: "16.99",
        isAvailable: true,
        stockQuantity: 8,
        imageUrl: "https://picsum.photos/seed/cheeseburger/800/600",
      },
      {
        categoryId: mainsId,
        name: "Herb Roasted Chicken",
        description:
          "Half chicken roasted with rosemary and lemon, served with pan jus and seasonal vegetables.",
        price: "21.50",
        isAvailable: true,
        stockQuantity: 5,
        imageUrl: null,
      },
      {
        categoryId: mainsId,
        name: "Grilled Salmon",
        description:
          "Atlantic salmon with citrus beurre blanc, asparagus, and herbed rice.",
        price: "24.99",
        isAvailable: false,
        stockQuantity: 0,
        imageUrl: "https://picsum.photos/seed/grilled-salmon/800/600",
      },
      {
        categoryId: dessertsId,
        name: "Chocolate Lava Cake",
        description:
          "Warm dark chocolate cake with a molten center, vanilla ice cream, and raspberry coulis.",
        price: "10.99",
        isAvailable: true,
        stockQuantity: 6,
        imageUrl: "https://picsum.photos/seed/lava-cake/800/600",
      },
      {
        categoryId: dessertsId,
        name: "New York Cheesecake",
        description:
          "Dense vanilla cheesecake on a graham crust with blueberry compote.",
        price: "8.99",
        isAvailable: true,
        stockQuantity: null,
        imageUrl: null,
      },
      {
        categoryId: beveragesId,
        name: "Sparkling Citrus Spritz",
        description:
          "House sparkling water with orange, grapefruit, and a hint of mint.",
        price: "8.99",
        isAvailable: true,
        stockQuantity: null,
        imageUrl: "https://picsum.photos/seed/citrus-spritz/800/600",
      },
      {
        categoryId: beveragesId,
        name: "Cold Brew Affogato",
        description:
          "Vanilla gelato drowned in house cold brew, finished with cocoa nibs.",
        price: "9.49",
        isAvailable: false,
        stockQuantity: 3,
        imageUrl: null,
      },
    ])
    .returning();

  console.log(`Inserted ${insertedMenuItems.length} menu items:`);
  for (const item of insertedMenuItems) {
    const availability = item.isAvailable ? "available" : "unavailable";
    const stock =
      item.stockQuantity === null ? "unlimited" : `${item.stockQuantity} in stock`;
    console.log(`  - ${item.name} ($${item.price}, ${availability}, ${stock})`);
  }

  console.log("Seed complete.");
}

seed().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
