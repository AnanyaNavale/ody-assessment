import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dietaryTag = pgEnum("dietary_tag", [
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "spicy",
]);

export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  stockQuantity: integer("stock_quantity"),
  imageUrl: text("image_url"),
  ingredients: text("ingredients"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const menuItemDietaryTags = pgTable(
  "menu_item_dietary_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    tag: dietaryTag("tag").notNull(),
  },
  (table) => ({
    menuItemTagUnique: uniqueIndex("menu_item_dietary_tags_item_tag_idx").on(
      table.menuItemId,
      table.tag,
    ),
  }),
);

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpent: numeric("total_spent", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderStatus = pgEnum("order_status", [
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    status: orderStatus("status").notNull().default("pending"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    tax: numeric("tax", { precision: 10, scale: 2 }).notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    statusCreatedAtIdx: index("orders_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => menuItems.id),
  quantity: integer("quantity").notNull(),
  priceAtTime: numeric("price_at_time", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
});

export const restaurantSettings = pgTable("restaurant_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  prepTimeMinutes: integer("prep_time_minutes").notNull().default(15),
  autoAcceptOrders: boolean("auto_accept_orders").notNull().default(true),
  serviceAvailable: boolean("service_available").notNull().default(true),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 })
    .notNull()
    .default("0.0800"),
  openingTime: text("opening_time"),
  closingTime: text("closing_time"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export const insertCategorySchema = createInsertSchema(categories);
export const selectCategorySchema = createSelectSchema(categories);

export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
export const insertMenuItemSchema = createInsertSchema(menuItems);
export const selectMenuItemSchema = createSelectSchema(menuItems);

export type MenuItemDietaryTag = typeof menuItemDietaryTags.$inferSelect;
export type NewMenuItemDietaryTag = typeof menuItemDietaryTags.$inferInsert;
export const insertMenuItemDietaryTagSchema =
  createInsertSchema(menuItemDietaryTags);
export const selectMenuItemDietaryTagSchema =
  createSelectSchema(menuItemDietaryTags);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export const insertCustomerSchema = createInsertSchema(customers);
export const selectCustomerSchema = createSelectSchema(customers);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export const insertOrderSchema = createInsertSchema(orders);
export const selectOrderSchema = createSelectSchema(orders);

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export const insertOrderItemSchema = createInsertSchema(orderItems);
export const selectOrderItemSchema = createSelectSchema(orderItems);

export type RestaurantSettings = typeof restaurantSettings.$inferSelect;
export type NewRestaurantSettings = typeof restaurantSettings.$inferInsert;
export const insertRestaurantSettingsSchema =
  createInsertSchema(restaurantSettings);
export const selectRestaurantSettingsSchema =
  createSelectSchema(restaurantSettings);

export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type DietaryTag = (typeof dietaryTag.enumValues)[number];
