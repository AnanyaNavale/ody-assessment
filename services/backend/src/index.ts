import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, asc } from "drizzle-orm";
import {
  createDb,
  categories,
  menuItems,
  type Category,
  type MenuItem,
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

app.doc("/api/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "Ody Menu API",
    version: "1.0.0",
    description: "Restaurant menu management API",
  },
});

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