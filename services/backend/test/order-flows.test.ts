import { describe, expect, it } from "vitest";
import { createOrderFlowApp, type OrderFlowStore } from "../src/order-flow-app";
import {
  calculateOrderTotals,
  evaluateCreateOrder,
  isAllowedStatusTransition,
  money,
  type OrderStatusValue,
} from "../src/order-rules";

const CUSTOMER_ID = "11111111-1111-1111-1111-111111111111";
const AVAILABLE_ITEM_ID = "22222222-2222-2222-2222-222222222222";
const UNAVAILABLE_ITEM_ID = "33333333-3333-3333-3333-333333333333";

function store(overrides: Partial<OrderFlowStore> = {}): OrderFlowStore {
  return {
    serviceAvailable: true,
    customers: new Map([[CUSTOMER_ID, { id: CUSTOMER_ID }]]),
    menuItems: new Map([
      [
        AVAILABLE_ITEM_ID,
        { id: AVAILABLE_ITEM_ID, price: "12.50", stockQuantity: 8 },
      ],
      [
        UNAVAILABLE_ITEM_ID,
        { id: UNAVAILABLE_ITEM_ID, price: "9.00", stockQuantity: 0 },
      ],
    ]),
    orders: new Map(),
    ...overrides,
  };
}

describe("evaluateCreateOrder", () => {
  it("rejects an order that includes an unavailable menu item", () => {
    const result = evaluateCreateOrder({
      customer: { id: CUSTOMER_ID },
      menuItems: [
        { id: AVAILABLE_ITEM_ID, price: "12.50", stockQuantity: 8 },
        { id: UNAVAILABLE_ITEM_ID, price: "9.00", stockQuantity: 0 },
      ],
      items: [{ menuItemId: UNAVAILABLE_ITEM_ID, quantity: 1 }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.status).toBe(400);
    expect(result.message).toContain("unavailable");
  });

  it("rejects an order when the kitchen is closed", () => {
    const result = evaluateCreateOrder({
      customer: { id: CUSTOMER_ID },
      menuItems: [{ id: AVAILABLE_ITEM_ID, price: "12.50", stockQuantity: 8 }],
      items: [{ menuItemId: AVAILABLE_ITEM_ID, quantity: 1 }],
      serviceAvailable: false,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.status).toBe(400);
    expect(result.message).toBe("Kitchen is currently closed");
  });

  it("creates a valid order and calculates line and order totals server-side", () => {
    const result = evaluateCreateOrder({
      customer: { id: CUSTOMER_ID },
      menuItems: [{ id: AVAILABLE_ITEM_ID, price: "12.50", stockQuantity: 8 }],
      items: [
        { menuItemId: AVAILABLE_ITEM_ID, quantity: 2 },
        { menuItemId: AVAILABLE_ITEM_ID, quantity: 1 },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.lineItems).toHaveLength(2);
    expect(result.lineItems[0]?.subtotal).toBe("25.00");
    expect(result.lineItems[1]?.subtotal).toBe("12.50");
    expect(result.subtotal).toBe(37.5);
    expect(result.tax).toBeCloseTo(3, 8);
    expect(result.total).toBeCloseTo(40.5, 8);
    expect(money(result.total)).toBe("40.50");
  });

  it("does not trust a client-supplied total", () => {
    const lines = [{ price: 10, quantity: 3 }];
    const serverTotals = calculateOrderTotals(lines, 0.08);

    expect(serverTotals.subtotal).toBe(30);
    expect(serverTotals.tax).toBeCloseTo(2.4, 8);
    expect(serverTotals.total).toBeCloseTo(32.4, 8);
    expect(serverTotals.total).not.toBe(1);
  });
});

describe("order status transitions", () => {
  const valid: Array<[OrderStatusValue, OrderStatusValue]> = [
    ["pending", "preparing"],
    ["pending", "cancelled"],
    ["preparing", "ready"],
    ["preparing", "cancelled"],
    ["ready", "completed"],
    ["ready", "cancelled"],
  ];

  const invalid: Array<[OrderStatusValue, OrderStatusValue]> = [
    ["pending", "ready"],
    ["pending", "completed"],
    ["preparing", "pending"],
    ["preparing", "completed"],
    ["ready", "pending"],
    ["ready", "preparing"],
    ["completed", "pending"],
    ["completed", "preparing"],
    ["completed", "ready"],
    ["completed", "cancelled"],
    ["cancelled", "pending"],
    ["cancelled", "completed"],
  ];

  it.each(valid)("allows %s → %s", (current, next) => {
    expect(isAllowedStatusTransition(current, next)).toBe(true);
  });

  it.each(invalid)("rejects %s → %s", (current, next) => {
    expect(isAllowedStatusTransition(current, next)).toBe(false);
  });
});

describe("Hono order flow routes", () => {
  it("rejects create order with an unavailable item over HTTP", async () => {
    const app = createOrderFlowApp(store());
    const response = await app.request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: CUSTOMER_ID,
        items: [{ menuItemId: UNAVAILABLE_ITEM_ID, quantity: 1 }],
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain("unavailable");
  });

  it("creates a valid order and returns server-calculated totals", async () => {
    const app = createOrderFlowApp(store());
    const response = await app.request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: CUSTOMER_ID,
        items: [{ menuItemId: AVAILABLE_ITEM_ID, quantity: 2 }],
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.status).toBe("pending");
    expect(body.subtotal).toBe("25.00");
    expect(body.tax).toBe("2.00");
    expect(body.total).toBe("27.00");
  });

  it("rejects an invalid status transition over HTTP", async () => {
    const memory = store();
    memory.orders.set("order-1", {
      id: "order-1",
      status: "completed",
      subtotal: "10.00",
      tax: "0.80",
      total: "10.80",
    });
    const app = createOrderFlowApp(memory);

    const response = await app.request("/api/orders/order-1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain("Invalid status transition");
  });

  it("allows a valid status transition over HTTP", async () => {
    const memory = store();
    memory.orders.set("order-2", {
      id: "order-2",
      status: "pending",
      subtotal: "10.00",
      tax: "0.80",
      total: "10.80",
    });
    const app = createOrderFlowApp(memory);

    const response = await app.request("/api/orders/order-2/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "preparing" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("preparing");
  });

  it("rejects create order when the kitchen is closed", async () => {
    const app = createOrderFlowApp(store({ serviceAvailable: false }));
    const response = await app.request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: CUSTOMER_ID,
        items: [{ menuItemId: AVAILABLE_ITEM_ID, quantity: 1 }],
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Kitchen is currently closed");
  });
});
