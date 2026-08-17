import { Hono } from "hono";
import {
  evaluateCreateOrder,
  isAllowedStatusTransition,
  money,
  type OrderStatusValue,
} from "./order-rules";

export type OrderFlowStore = {
  serviceAvailable: boolean;
  customers: Map<string, { id: string }>;
  menuItems: Map<
    string,
    { id: string; price: string; stockQuantity: number | null }
  >;
  orders: Map<
    string,
    {
      id: string;
      status: OrderStatusValue;
      subtotal: string;
      tax: string;
      total: string;
    }
  >;
};

export function createOrderFlowApp(store: OrderFlowStore) {
  const app = new Hono();

  app.post("/api/orders", async (c) => {
    const body = await c.req.json<{
      customerId: string;
      items: Array<{ menuItemId: string; quantity: number; notes?: string | null }>;
    }>();

    const result = evaluateCreateOrder({
      customer: store.customers.get(body.customerId),
      menuItems: [...store.menuItems.values()],
      items: body.items,
      serviceAvailable: store.serviceAvailable,
    });

    if (!result.ok) {
      return c.json({ error: result.error, message: result.message }, result.status);
    }

    const id = crypto.randomUUID();
    const order = {
      id,
      status: "pending" as const,
      subtotal: money(result.subtotal),
      tax: money(result.tax),
      total: money(result.total),
    };
    store.orders.set(id, order);

    return c.json(order, 201);
  });

  app.patch("/api/orders/:id/status", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<{ status: OrderStatusValue }>();
    const existing = store.orders.get(id);

    if (!existing) {
      return c.json({ error: "Not Found", message: "Order not found" }, 404);
    }

    if (!isAllowedStatusTransition(existing.status, body.status)) {
      return c.json(
        {
          error: "Bad Request",
          message: `Invalid status transition from ${existing.status} to ${body.status}`,
        },
        400,
      );
    }

    const updated = { ...existing, status: body.status };
    store.orders.set(id, updated);
    return c.json(updated, 200);
  });

  return app;
}
