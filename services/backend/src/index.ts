import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, ne, asc, inArray, desc, and, or, ilike, sql, sum, count } from "drizzle-orm";
import { cors } from "hono/cors";
import {
  createDb,
  categories,
  customers,
  menuItems,
  orderItems,
  orders,
  restaurantSettings,
  type Category,
  type MenuItem,
  type Order,
} from "./db";

// Cloudflare Workers environment bindings
type Bindings = {
  DATABASE_URL: string;
};

// Context variables
type Variables = {
  db: ReturnType<typeof createDb>;
};

const ErrorSchema = z
  .object({
    error: z.string(),
    message: z.string().optional(),
  })
  .openapi("Error");

const CategorySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    displayOrder: z.number().int(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Category");

const CreateCategorySchema = z
  .object({
    name: z.string().min(1),
    displayOrder: z.number().int().optional(),
  })
  .openapi("CreateCategory");

const UpdateCategorySchema =
  CreateCategorySchema.partial().openapi("UpdateCategory");

const MenuItemSchema = z
  .object({
    id: z.string().uuid(),
    categoryId: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    price: z.string(),
    isAvailable: z.boolean(),
    stockQuantity: z.number().int().nullable(),
    imageUrl: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("MenuItem");

const CreateMenuItemSchema = z
  .object({
    categoryId: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    price: z.string().min(1),
    isAvailable: z.boolean().optional(),
    stockQuantity: z.number().int().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
  })
  .openapi("CreateMenuItem");

const UpdateMenuItemSchema =
  CreateMenuItemSchema.partial().openapi("UpdateMenuItem");

const IdParamSchema = z.object({
  id: z
    .string()
    .uuid()
    .openapi({
      param: { name: "id", in: "path" },
      example: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    }),
});

const MenuItemQuerySchema = z.object({
  categoryId: z
    .string()
    .uuid()
    .optional()
    .openapi({
      param: { name: "categoryId", in: "query" },
      description: "Optional category filter",
    }),
});

const DeleteResultSchema = z
  .object({
    message: z.string(),
    id: z.string().uuid(),
  })
  .openapi("DeleteResult");

const CreateOrderItemSchema = z
  .object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
    notes: z.string().optional(),
  })
  .openapi("CreateOrderItem");

const CreateOrderSchema = z
  .object({
    customerId: z.string().uuid().openapi({
      example: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    }),
    items: z.array(CreateOrderItemSchema).min(1),
    notes: z.string().optional(),
    orderType: z.enum(["dine_in", "pickup", "delivery"]).optional(),
  })
  .openapi("CreateOrder");

const OrderStatusSchema = z.enum([
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
]);

type OrderStatusValue = z.infer<typeof OrderStatusSchema>;

const ALLOWED_STATUS_TRANSITIONS: Record<
  OrderStatusValue,
  readonly OrderStatusValue[]
> = {
  pending: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

function isAllowedStatusTransition(
  currentStatus: OrderStatusValue,
  nextStatus: OrderStatusValue,
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

const UpdateOrderStatusSchema = z
  .object({
    status: OrderStatusSchema,
  })
  .openapi("UpdateOrderStatus");

const OrderSchema = z
  .object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    status: OrderStatusSchema,
    orderType: z.enum(["dine_in", "pickup", "delivery"]),
    subtotal: z.string(),
    tax: z.string(),
    total: z.string(),
    notes: z.string().nullable(),
    createdAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Order");

const OrderCustomerSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
  })
  .openapi("OrderCustomer");

const OrderLineMenuItemSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
  })
  .openapi("OrderLineMenuItem");

const OrderLineItemSchema = z
  .object({
    id: z.string().uuid(),
    menuItemId: z.string().uuid(),
    quantity: z.number().int(),
    priceAtTime: z.string(),
    subtotal: z.string(),
    notes: z.string().nullable(),
    menuItem: OrderLineMenuItemSchema,
  })
  .openapi("OrderLineItem");

const OrderWithDetailsSchema = OrderSchema.extend({
  customer: OrderCustomerSchema,
  orderItems: z.array(OrderLineItemSchema),
}).openapi("OrderWithDetails");

const ListOrdersQuerySchema = z.object({
  status: z
    .enum(["pending", "preparing", "ready", "completed", "cancelled"])
    .optional()
    .openapi({
      param: { name: "status", in: "query" },
    }),
  customerId: z
    .string()
    .uuid()
    .optional()
    .openapi({
      param: { name: "customerId", in: "query" },
    }),
  search: z
    .string()
    .optional()
    .openapi({
      param: { name: "search", in: "query" },
    }),
  sortBy: z
    .enum(["createdAt", "total"])
    .optional()
    .openapi({
      param: { name: "sortBy", in: "query" },
    }),
  sortOrder: z
    .enum(["asc", "desc"])
    .optional()
    .openapi({
      param: { name: "sortOrder", in: "query" },
    }),
  dateFilter: z
    .enum(["today", "last_7_days", "last_30_days", "all"])
    .optional()
    .openapi({
      param: { name: "dateFilter", in: "query" },
    }),
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    param: { name: "limit", in: "query" },
  }),
  offset: z.coerce.number().int().min(0).default(0).openapi({
    param: { name: "offset", in: "query" },
  }),
});

const ListCustomersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    param: { name: "limit", in: "query" },
  }),
  offset: z.coerce.number().int().min(0).default(0).openapi({
    param: { name: "offset", in: "query" },
  }),
});

const CustomerOrderSummarySchema = z
  .object({
    id: z.string().uuid(),
    status: OrderStatusSchema,
    orderType: z.enum(["dine_in", "pickup", "delivery"]),
    total: z.string(),
    createdAt: z.string().datetime(),
  })
  .openapi("CustomerOrderSummary");

const CustomerSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    totalOrders: z.number().int(),
    totalSpent: z.string(),
    createdAt: z.string().datetime(),
  })
  .openapi("Customer");

const CustomerListItemSchema = CustomerSchema.extend({
  recentOrders: z.array(CustomerOrderSummarySchema),
}).openapi("CustomerListItem");

const CustomerDetailSchema = CustomerSchema.extend({
  orders: z.array(CustomerOrderSummarySchema),
}).openapi("CustomerDetail");

const PopularItemSchema = z
  .object({
    menuItemId: z.string().uuid(),
    menuItemName: z.string(),
    orderCount: z.number().int(),
  })
  .openapi("PopularItem");

const DashboardStatsSchema = z
  .object({
    totalRevenue: z.string(),
    totalOrders: z.number().int(),
    pendingOrders: z.number().int(),
    completedToday: z.number().int(),
    averageOrderValue: z.string(),
    popularItems: z.array(PopularItemSchema),
  })
  .openapi("DashboardStats");

const RestaurantSettingsSchema = z
  .object({
    id: z.string().uuid(),
    restaurantName: z.string(),
    prepTimeMinutes: z.number().int(),
    autoAcceptOrders: z.boolean(),
    serviceAvailable: z.boolean(),
    taxRate: z.string(),
    openingTime: z.string().nullable(),
    closingTime: z.string().nullable(),
    updatedAt: z.string().datetime(),
  })
  .openapi("RestaurantSettings");

const UpdateRestaurantSettingsSchema = z
  .object({
    restaurantName: z.string().min(1).max(120).optional(),
    prepTimeMinutes: z.number().int().min(5).max(120).optional(),
    autoAcceptOrders: z.boolean().optional(),
    serviceAvailable: z.boolean().optional(),
    taxRate: z
      .string()
      .regex(/^\d+\.\d{4}$/)
      .optional(),
    openingTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    closingTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
  })
  .openapi("UpdateRestaurantSettings");

const DEFAULT_RESTAURANT_SETTINGS = {
  id: "00000000-0000-0000-0000-000000000000",
  restaurantName: "Ody Restaurant",
  prepTimeMinutes: 15,
  autoAcceptOrders: true,
  serviceAvailable: true,
  taxRate: "0.0800",
  openingTime: null as string | null,
  closingTime: null as string | null,
  updatedAt: new Date(0),
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function serializeCategory(row: Category) {
  return {
    id: row.id,
    name: row.name,
    displayOrder: row.displayOrder,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function serializeMenuItem(row: MenuItem) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description,
    price: row.price,
    isAvailable: row.isAvailable,
    stockQuantity: row.stockQuantity,
    imageUrl: row.imageUrl,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function serializeOrder(row: Order) {
  return {
    id: row.id,
    customerId: row.customerId,
    status: row.status,
    orderType: row.orderType,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    notes: row.notes,
    createdAt: toIso(row.createdAt),
    completedAt: row.completedAt ? toIso(row.completedAt) : null,
    updatedAt: toIso(row.updatedAt),
  };
}

function serializeOrderCustomer(row: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
  };
}

type OrderLineRow = {
  id: string;
  menuItemId: string;
  quantity: number;
  priceAtTime: string;
  subtotal: string;
  notes: string | null;
  menuItem: {
    id: string;
    name: string;
  };
};

function serializeOrderWithDetails(
  order: Order,
  customer: { id: string; name: string; email: string; phone: string | null },
  items: OrderLineRow[],
) {
  return {
    ...serializeOrder(order),
    customer: serializeOrderCustomer(customer),
    orderItems: items,
  };
}

function money(value: number): string {
  return value.toFixed(2);
}

function serializeCustomer(row: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalOrders: number;
  totalSpent: string;
  createdAt: Date | string;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    totalOrders: row.totalOrders,
    totalSpent: row.totalSpent,
    createdAt: toIso(row.createdAt),
  };
}

function serializeCustomerOrderSummary(row: {
  id: string;
  status: Order["status"];
  orderType: Order["orderType"];
  total: string;
  createdAt: Date | string;
}) {
  return {
    id: row.id,
    status: row.status,
    orderType: row.orderType,
    total: row.total,
    createdAt: toIso(row.createdAt),
  };
}

function toCount(value: number | bigint | string | null | undefined): number {
  return Number(value ?? 0);
}

function serializeRestaurantSettings(row: {
  id: string;
  restaurantName: string;
  prepTimeMinutes: number;
  autoAcceptOrders: boolean;
  serviceAvailable: boolean;
  taxRate: string;
  openingTime: string | null;
  closingTime: string | null;
  updatedAt: Date | string;
}) {
  return {
    id: row.id,
    restaurantName: row.restaurantName,
    prepTimeMinutes: row.prepTimeMinutes,
    autoAcceptOrders: row.autoAcceptOrders,
    serviceAvailable: row.serviceAvailable,
    taxRate: row.taxRate,
    openingTime: row.openingTime,
    closingTime: row.closingTime,
    updatedAt: toIso(row.updatedAt),
  };
}

function jsonContent<T extends z.ZodType>(schema: T, description: string) {
  return {
    content: {
      "application/json": {
        schema,
      },
    },
    description,
  };
}

function isForeignKeyError(error: unknown): boolean {
  return error instanceof Error && /foreign key/i.test(error.message);
}

const listCategoriesRoute = createRoute({
  method: "get",
  path: "/api/categories",
  tags: ["Categories"],
  summary: "List all categories",
  responses: {
    200: jsonContent(z.array(CategorySchema), "All menu categories"),
  },
});

const getCategoryRoute = createRoute({
  method: "get",
  path: "/api/categories/{id}",
  tags: ["Categories"],
  summary: "Get a category",
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: jsonContent(CategorySchema, "Category found"),
    404: jsonContent(ErrorSchema, "Category not found"),
  },
});

const createCategoryRoute = createRoute({
  method: "post",
  path: "/api/categories",
  tags: ["Categories"],
  summary: "Create a category",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CreateCategorySchema,
        },
      },
    },
  },
  responses: {
    201: jsonContent(CategorySchema, "Category created"),
    400: jsonContent(ErrorSchema, "Invalid request body"),
  },
});

const updateCategoryRoute = createRoute({
  method: "put",
  path: "/api/categories/{id}",
  tags: ["Categories"],
  summary: "Update a category",
  request: {
    params: IdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: UpdateCategorySchema,
        },
      },
    },
  },
  responses: {
    200: jsonContent(CategorySchema, "Category updated"),
    400: jsonContent(ErrorSchema, "Invalid request"),
    404: jsonContent(ErrorSchema, "Category not found"),
  },
});

const deleteCategoryRoute = createRoute({
  method: "delete",
  path: "/api/categories/{id}",
  tags: ["Categories"],
  summary: "Delete a category",
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: jsonContent(DeleteResultSchema, "Category deleted"),
    404: jsonContent(ErrorSchema, "Category not found"),
  },
});

const listMenuItemsRoute = createRoute({
  method: "get",
  path: "/api/menu-items",
  tags: ["Menu Items"],
  summary: "List menu items",
  request: {
    query: MenuItemQuerySchema,
  },
  responses: {
    200: jsonContent(z.array(MenuItemSchema), "Menu items"),
    400: jsonContent(ErrorSchema, "Invalid query"),
  },
});

const getMenuItemRoute = createRoute({
  method: "get",
  path: "/api/menu-items/{id}",
  tags: ["Menu Items"],
  summary: "Get a menu item",
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: jsonContent(MenuItemSchema, "Menu item found"),
    404: jsonContent(ErrorSchema, "Menu item not found"),
  },
});

const createMenuItemRoute = createRoute({
  method: "post",
  path: "/api/menu-items",
  tags: ["Menu Items"],
  summary: "Create a menu item",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CreateMenuItemSchema,
        },
      },
    },
  },
  responses: {
    201: jsonContent(MenuItemSchema, "Menu item created"),
    400: jsonContent(ErrorSchema, "Invalid request body"),
  },
});

const updateMenuItemRoute = createRoute({
  method: "put",
  path: "/api/menu-items/{id}",
  tags: ["Menu Items"],
  summary: "Update a menu item",
  request: {
    params: IdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: UpdateMenuItemSchema,
        },
      },
    },
  },
  responses: {
    200: jsonContent(MenuItemSchema, "Menu item updated"),
    400: jsonContent(ErrorSchema, "Invalid request"),
    404: jsonContent(ErrorSchema, "Menu item not found"),
  },
});

const deleteMenuItemRoute = createRoute({
  method: "delete",
  path: "/api/menu-items/{id}",
  tags: ["Menu Items"],
  summary: "Delete a menu item",
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: jsonContent(DeleteResultSchema, "Menu item deleted"),
    404: jsonContent(ErrorSchema, "Menu item not found"),
  },
});

const createOrderRoute = createRoute({
  method: "post",
  path: "/api/orders",
  tags: ["orders"],
  summary: "Create a new order",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CreateOrderSchema,
        },
      },
    },
  },
  responses: {
    201: jsonContent(OrderSchema, "Order created"),
    400: jsonContent(ErrorSchema, "Validation error"),
    404: jsonContent(ErrorSchema, "Customer not found"),
    500: jsonContent(ErrorSchema, "Server error"),
  },
});

const listOrdersRoute = createRoute({
  method: "get",
  path: "/api/orders",
  tags: ["orders"],
  summary: "List orders with optional filters",
  request: {
    query: ListOrdersQuerySchema,
  },
  responses: {
    200: jsonContent(z.array(OrderWithDetailsSchema), "Orders"),
    400: jsonContent(ErrorSchema, "Invalid query"),
  },
});

const getOrderRoute = createRoute({
  method: "get",
  path: "/api/orders/{id}",
  tags: ["orders"],
  summary: "Get order details",
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: jsonContent(OrderWithDetailsSchema, "Order found"),
    404: jsonContent(ErrorSchema, "Order not found"),
  },
});

const updateOrderStatusRoute = createRoute({
  method: "patch",
  path: "/api/orders/{id}/status",
  tags: ["orders"],
  summary: "Update order status with validation",
  request: {
    params: IdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: UpdateOrderStatusSchema,
        },
      },
    },
  },
  responses: {
    200: jsonContent(OrderWithDetailsSchema, "Order status updated"),
    400: jsonContent(ErrorSchema, "Invalid status transition"),
    404: jsonContent(ErrorSchema, "Order not found"),
  },
});

const listCustomersRoute = createRoute({
  method: "get",
  path: "/api/customers",
  tags: ["customers"],
  summary: "List customers with order stats",
  request: {
    query: ListCustomersQuerySchema,
  },
  responses: {
    200: jsonContent(z.array(CustomerListItemSchema), "Customers"),
    400: jsonContent(ErrorSchema, "Invalid query"),
  },
});

const getCustomerRoute = createRoute({
  method: "get",
  path: "/api/customers/{id}",
  tags: ["customers"],
  summary: "Get customer details",
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: jsonContent(CustomerDetailSchema, "Customer found"),
    404: jsonContent(ErrorSchema, "Customer not found"),
  },
});

const dashboardStatsRoute = createRoute({
  method: "get",
  path: "/api/dashboard/stats",
  tags: ["dashboard"],
  summary: "Get KPI statistics for home page",
  responses: {
    200: jsonContent(DashboardStatsSchema, "Dashboard KPIs"),
  },
});

const getSettingsRoute = createRoute({
  method: "get",
  path: "/api/settings",
  tags: ["settings"],
  summary: "Get restaurant settings",
  responses: {
    200: jsonContent(RestaurantSettingsSchema, "Restaurant settings"),
  },
});

const updateSettingsRoute = createRoute({
  method: "patch",
  path: "/api/settings",
  tags: ["settings"],
  summary: "Update restaurant settings",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: UpdateRestaurantSettingsSchema,
        },
      },
    },
  },
  responses: {
    200: jsonContent(RestaurantSettingsSchema, "Settings updated"),
    400: jsonContent(ErrorSchema, "Invalid request body"),
  },
});

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: "Bad Request",
          message: result.error.issues.map((issue) => issue.message).join(", "),
        },
        400,
      );
    }
  },
});

app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

// Middleware to create db instance per request
app.use("*", async (c, next) => {
  const databaseUrl = c.env.DATABASE_URL || "placeholder-for-local-dev";
  c.set("db", createDb(databaseUrl));
  await next();
});

app.openapi(listCategoriesRoute, async (c) => {
  const db = c.get("db");
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name));

  return c.json(rows.map(serializeCategory), 200);
});

app.openapi(getCategoryRoute, async (c) => {
  const db = c.get("db");
  const { id } = c.req.valid("param");
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (!row) {
    return c.json({ error: "Not Found", message: "Category not found" }, 404);
  }

  return c.json(serializeCategory(row), 200);
});

app.openapi(createCategoryRoute, async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");
  const [row] = await db.insert(categories).values(body).returning();

  if (!row) {
    return c.json(
      { error: "Bad Request", message: "Failed to create category" },
      400,
    );
  }

  return c.json(serializeCategory(row), 201);
});

app.openapi(updateCategoryRoute, async (c) => {
  const db = c.get("db");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const [row] = await db
    .update(categories)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();

  if (!row) {
    return c.json({ error: "Not Found", message: "Category not found" }, 404);
  }

  return c.json(serializeCategory(row), 200);
});

app.openapi(deleteCategoryRoute, async (c) => {
  const db = c.get("db");
  const { id } = c.req.valid("param");
  const [row] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });

  if (!row) {
    return c.json({ error: "Not Found", message: "Category not found" }, 404);
  }

  return c.json({ message: "Category deleted", id: row.id }, 200);
});

app.openapi(listMenuItemsRoute, async (c) => {
  const db = c.get("db");
  const { categoryId } = c.req.valid("query");
  const rows = await db
    .select()
    .from(menuItems)
    .where(categoryId ? eq(menuItems.categoryId, categoryId) : undefined)
    .orderBy(asc(menuItems.name));

  return c.json(rows.map(serializeMenuItem), 200);
});

app.openapi(getMenuItemRoute, async (c) => {
  const db = c.get("db");
  const { id } = c.req.valid("param");
  const [row] = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.id, id))
    .limit(1);

  if (!row) {
    return c.json({ error: "Not Found", message: "Menu item not found" }, 404);
  }

  return c.json(serializeMenuItem(row), 200);
});

app.openapi(createMenuItemRoute, async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");

  try {
    const [row] = await db.insert(menuItems).values(body).returning();

    if (!row) {
      return c.json(
        { error: "Bad Request", message: "Failed to create menu item" },
        400,
      );
    }

    return c.json(serializeMenuItem(row), 201);
  } catch (error) {
    if (isForeignKeyError(error)) {
      return c.json(
        { error: "Bad Request", message: "Category does not exist" },
        400,
      );
    }

    throw error;
  }
});

app.openapi(updateMenuItemRoute, async (c) => {
  const db = c.get("db");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  try {
    const [row] = await db
      .update(menuItems)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();

    if (!row) {
      return c.json(
        { error: "Not Found", message: "Menu item not found" },
        404,
      );
    }

    return c.json(serializeMenuItem(row), 200);
  } catch (error) {
    if (isForeignKeyError(error)) {
      return c.json(
        { error: "Bad Request", message: "Category does not exist" },
        400,
      );
    }

    throw error;
  }
});

app.openapi(deleteMenuItemRoute, async (c) => {
  const db = c.get("db");
  const { id } = c.req.valid("param");
  const [row] = await db
    .delete(menuItems)
    .where(eq(menuItems.id, id))
    .returning({ id: menuItems.id });

  if (!row) {
    return c.json({ error: "Not Found", message: "Menu item not found" }, 404);
  }

  return c.json({ message: "Menu item deleted", id: row.id }, 200);
});

app.openapi(createOrderRoute, async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");

  try {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, body.customerId))
      .limit(1);

    if (!customer) {
      return c.json(
        { error: "Not Found", message: "Customer not found" },
        404,
      );
    }

    const menuItemIds = [...new Set(body.items.map((item) => item.menuItemId))];
    const referencedItems = await db
      .select()
      .from(menuItems)
      .where(inArray(menuItems.id, menuItemIds));

    const foundIds = new Set(referencedItems.map((item) => item.id));
    const missingIds = menuItemIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      return c.json(
        {
          error: "Bad Request",
          message: `Menu items not found: ${missingIds.join(", ")}`,
        },
        400,
      );
    }

    const unavailableItems = referencedItems.filter((item) => !item.isAvailable);

    if (unavailableItems.length > 0) {
      return c.json(
        {
          error: "Bad Request",
          message: `Menu items unavailable: ${unavailableItems
            .map((item) => item.id)
            .join(", ")}`,
        },
        400,
      );
    }

    const itemsById = new Map(
      referencedItems.map((item) => [item.id, item] as const),
    );
    const lineItems = body.items.map((item) => {
      const menuItem = itemsById.get(item.menuItemId);

      if (!menuItem) {
        throw new Error(`Menu item missing after validation: ${item.menuItemId}`);
      }

      const priceAtTime = Number(menuItem.price);
      const itemSubtotal = priceAtTime * item.quantity;

      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        notes: item.notes,
        priceAtTime: money(priceAtTime),
        subtotal: money(itemSubtotal),
      };
    });

    const orderSubtotal = lineItems.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0,
    );
    const tax = orderSubtotal * 0.08;
    const total = orderSubtotal + tax;

    const [order] = await db
      .insert(orders)
      .values({
        customerId: body.customerId,
        status: "pending",
        orderType: body.orderType ?? "dine_in",
        subtotal: money(orderSubtotal),
        tax: money(tax),
        total: money(total),
        notes: body.notes,
      })
      .returning();

    if (!order) {
      return c.json(
        { error: "Internal Server Error", message: "Failed to create order" },
        500,
      );
    }

    await db.insert(orderItems).values(
      lineItems.map((item) => ({
        ...item,
        orderId: order.id,
      })),
    );

    await db
      .update(customers)
      .set({
        totalOrders: customer.totalOrders + 1,
        totalSpent: money(Number(customer.totalSpent) + Number(order.total)),
      })
      .where(eq(customers.id, customer.id));

    return c.json(serializeOrder(order), 201);
  } catch (error) {
    console.error(error);
    return c.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unexpected error",
      },
      500,
    );
  }
});

function dateFilterCondition(
  dateFilter: "today" | "last_7_days" | "last_30_days" | "all" | undefined,
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled" | undefined,
) {
  if (!dateFilter || dateFilter === "all") {
    return undefined;
  }

  if (status === "completed") {
    if (dateFilter === "today") {
      return sql`COALESCE(${orders.completedAt}, ${orders.createdAt})::date = CURRENT_DATE`;
    }

    if (dateFilter === "last_7_days") {
      return sql`COALESCE(${orders.completedAt}, ${orders.createdAt}) >= NOW() - INTERVAL '7 days'`;
    }

    return sql`COALESCE(${orders.completedAt}, ${orders.createdAt}) >= NOW() - INTERVAL '30 days'`;
  }

  if (dateFilter === "today") {
    return sql`${orders.createdAt}::date = CURRENT_DATE`;
  }

  if (dateFilter === "last_7_days") {
    return sql`${orders.createdAt} >= NOW() - INTERVAL '7 days'`;
  }

  return sql`${orders.createdAt} >= NOW() - INTERVAL '30 days'`;
}

app.openapi(listOrdersRoute, async (c) => {
  const db = c.get("db");
  const { status, customerId, search, sortBy, sortOrder, dateFilter, limit, offset } =
    c.req.valid("query");

  const trimmedSearch = search?.trim();
  const searchPattern = trimmedSearch ? `%${trimmedSearch}%` : undefined;

  const filters = [
    status ? eq(orders.status, status) : undefined,
    customerId ? eq(orders.customerId, customerId) : undefined,
    searchPattern
      ? or(
          ilike(customers.name, searchPattern),
          sql`CAST(${orders.id} AS text) ILIKE ${searchPattern}`,
        )
      : undefined,
    dateFilterCondition(dateFilter, status),
  ].filter((filter): filter is NonNullable<typeof filter> => filter !== undefined);

  const sortColumn = sortBy === "total" ? orders.total : orders.createdAt;
  const orderBy =
    (sortOrder ?? "asc") === "desc" ? desc(sortColumn) : asc(sortColumn);

  const rows = await db
    .select({
      order: orders,
      customer: customers,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const result = [];

  for (const row of rows) {
    const itemRows = await db
      .select({
        orderItem: orderItems,
        menuItem: menuItems,
      })
      .from(orderItems)
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(eq(orderItems.orderId, row.order.id));

    result.push(
      serializeOrderWithDetails(
        row.order,
        row.customer,
        itemRows.map((itemRow) => ({
          id: itemRow.orderItem.id,
          menuItemId: itemRow.orderItem.menuItemId,
          quantity: itemRow.orderItem.quantity,
          priceAtTime: itemRow.orderItem.priceAtTime,
          subtotal: itemRow.orderItem.subtotal,
          notes: itemRow.orderItem.notes,
          menuItem: {
            id: itemRow.menuItem.id,
            name: itemRow.menuItem.name,
          },
        })),
      ),
    );
  }

  return c.json(result, 200);
});

app.openapi(getOrderRoute, async (c) => {
  const db = c.get("db");
  const { id } = c.req.valid("param");

  const [row] = await db
    .select({
      order: orders,
      customer: customers,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!row) {
    return c.json({ error: "Not Found", message: "Order not found" }, 404);
  }

  const itemRows = await db
    .select({
      orderItem: orderItems,
      menuItem: menuItems,
    })
    .from(orderItems)
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(inArray(orderItems.orderId, [row.order.id]));

  return c.json(
    serializeOrderWithDetails(
      row.order,
      row.customer,
      itemRows.map((itemRow) => ({
        id: itemRow.orderItem.id,
        menuItemId: itemRow.orderItem.menuItemId,
        quantity: itemRow.orderItem.quantity,
        priceAtTime: itemRow.orderItem.priceAtTime,
        subtotal: itemRow.orderItem.subtotal,
        notes: itemRow.orderItem.notes,
        menuItem: {
          id: itemRow.menuItem.id,
          name: itemRow.menuItem.name,
        },
      })),
    ),
    200,
  );
});

app.openapi(updateOrderStatusRoute, async (c) => {
  const db = c.get("db");
  const { id } = c.req.valid("param");
  const { status: nextStatus } = c.req.valid("json");

  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ error: "Not Found", message: "Order not found" }, 404);
  }

  const currentStatus = existing.status;

  if (currentStatus === "completed" || currentStatus === "cancelled") {
    return c.json(
      {
        error: "Bad Request",
        message: "Order is already in final state",
      },
      400,
    );
  }

  if (!isAllowedStatusTransition(currentStatus, nextStatus)) {
    return c.json(
      {
        error: "Bad Request",
        message: `Invalid status transition from ${currentStatus} to ${nextStatus}`,
      },
      400,
    );
  }

  const [updated] = await db
    .update(orders)
    .set({
      status: nextStatus,
      updatedAt: new Date(),
      ...(nextStatus === "completed" ? { completedAt: new Date() } : {}),
    })
    .where(eq(orders.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: "Not Found", message: "Order not found" }, 404);
  }

  const [row] = await db
    .select({
      order: orders,
      customer: customers,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, updated.id))
    .limit(1);

  if (!row) {
    return c.json({ error: "Not Found", message: "Order not found" }, 404);
  }

  const itemRows = await db
    .select({
      orderItem: orderItems,
      menuItem: menuItems,
    })
    .from(orderItems)
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(eq(orderItems.orderId, row.order.id));

  return c.json(
    serializeOrderWithDetails(
      row.order,
      row.customer,
      itemRows.map((itemRow) => ({
        id: itemRow.orderItem.id,
        menuItemId: itemRow.orderItem.menuItemId,
        quantity: itemRow.orderItem.quantity,
        priceAtTime: itemRow.orderItem.priceAtTime,
        subtotal: itemRow.orderItem.subtotal,
        notes: itemRow.orderItem.notes,
        menuItem: {
          id: itemRow.menuItem.id,
          name: itemRow.menuItem.name,
        },
      })),
    ),
    200,
  );
});

app.openapi(listCustomersRoute, async (c) => {
  const db = c.get("db");
  const { limit, offset } = c.req.valid("query");

  const customerRows = await db
    .select()
    .from(customers)
    .orderBy(desc(customers.totalSpent))
    .limit(limit)
    .offset(offset);

  const result = [];

  for (const customer of customerRows) {
    const recentOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customer.id))
      .orderBy(desc(orders.createdAt))
      .limit(5);

    result.push({
      ...serializeCustomer(customer),
      recentOrders: recentOrders.map(serializeCustomerOrderSummary),
    });
  }

  return c.json(result, 200);
});

app.openapi(getCustomerRoute, async (c) => {
  const db = c.get("db");
  const { id } = c.req.valid("param");

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  if (!customer) {
    return c.json({ error: "Not Found", message: "Customer not found" }, 404);
  }

  const customerOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customer.id))
    .orderBy(desc(orders.createdAt));

  return c.json(
    {
      ...serializeCustomer(customer),
      orders: customerOrders.map(serializeCustomerOrderSummary),
    },
    200,
  );
});

app.openapi(dashboardStatsRoute, async (c) => {
  const db = c.get("db");
  const placedToday = sql`${orders.createdAt}::date = CURRENT_DATE`;
  const completedTodayCondition = and(
    eq(orders.status, "completed"),
    sql`COALESCE(${orders.completedAt}, ${orders.createdAt})::date = CURRENT_DATE`,
  );

  const [revenueRow] = await db
    .select({ totalRevenue: sum(orders.total) })
    .from(orders)
    .where(completedTodayCondition);

  const [totalOrdersRow] = await db
    .select({ totalOrders: count() })
    .from(orders)
    .where(and(placedToday, ne(orders.status, "cancelled")));

  const [pendingOrdersRow] = await db
    .select({ pendingOrders: count() })
    .from(orders)
    .where(eq(orders.status, "pending"));

  const [completedTodayRow] = await db
    .select({ completedToday: count() })
    .from(orders)
    .where(completedTodayCondition);

  const totalOrders = toCount(totalOrdersRow?.totalOrders);
  const completedToday = toCount(completedTodayRow?.completedToday);
  const totalRevenue = revenueRow?.totalRevenue ?? "0";
  const averageOrderValue =
    completedToday > 0
      ? money(Number(totalRevenue) / completedToday)
      : "0.00";

  const popularItemRows = await db
    .select({
      menuItemId: orderItems.menuItemId,
      menuItemName: menuItems.name,
      orderCount: count(),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(placedToday)
    .groupBy(orderItems.menuItemId, menuItems.name)
    .orderBy(desc(count()))
    .limit(5);

  return c.json(
    {
      totalRevenue,
      totalOrders,
      pendingOrders: toCount(pendingOrdersRow?.pendingOrders),
      completedToday,
      averageOrderValue,
      popularItems: popularItemRows.map((row) => ({
        menuItemId: row.menuItemId,
        menuItemName: row.menuItemName,
        orderCount: toCount(row.orderCount),
      })),
    },
    200,
  );
});

app.openapi(getSettingsRoute, async (c) => {
  const db = c.get("db");
  const [row] = await db.select().from(restaurantSettings).limit(1);

  if (!row) {
    return c.json(serializeRestaurantSettings(DEFAULT_RESTAURANT_SETTINGS), 200);
  }

  return c.json(serializeRestaurantSettings(row), 200);
});

app.openapi(updateSettingsRoute, async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");
  const [existing] = await db.select().from(restaurantSettings).limit(1);

  if (!existing) {
    const [created] = await db
      .insert(restaurantSettings)
      .values({
        restaurantName: body.restaurantName ?? "Ody Restaurant",
        prepTimeMinutes: body.prepTimeMinutes ?? 15,
        autoAcceptOrders: body.autoAcceptOrders ?? true,
        serviceAvailable: body.serviceAvailable ?? true,
        taxRate: body.taxRate ?? "0.0800",
        openingTime: body.openingTime,
        closingTime: body.closingTime,
      })
      .returning();

    if (!created) {
      return c.json(
        { error: "Internal Server Error", message: "Failed to create settings" },
        500,
      );
    }

    return c.json(serializeRestaurantSettings(created), 200);
  }

  const [updated] = await db
    .update(restaurantSettings)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(restaurantSettings.id, existing.id))
    .returning();

  if (!updated) {
    return c.json(
      { error: "Internal Server Error", message: "Failed to update settings" },
      500,
    );
  }

  return c.json(serializeRestaurantSettings(updated), 200);
});

export const openAPIConfig = {
  openapi: "3.0.0" as const,
  info: {
    title: "Ody Restaurant API",
    version: "1.0.0",
  },
};

app.doc("/api/openapi.json", openAPIConfig);

app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

app.notFound((c) => {
  return c.json({ error: "Not Found", message: "Route not found" }, 404);
});

app.onError((error, c) => {
  console.error(error);
  return c.json(
    {
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unexpected error",
    },
    500,
  );
});

export default app;