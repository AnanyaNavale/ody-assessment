export const ORDER_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

export const ALLOWED_STATUS_TRANSITIONS: Record<
  OrderStatusValue,
  readonly OrderStatusValue[]
> = {
  pending: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function isAllowedStatusTransition(
  currentStatus: OrderStatusValue,
  nextStatus: OrderStatusValue,
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function availabilityFromStock(stockQuantity: number | null): boolean {
  return stockQuantity !== 0;
}

export function money(value: number): string {
  return value.toFixed(2);
}

export function calculateOrderTotals(
  lines: Array<{ price: number; quantity: number }>,
  taxRate = 0.08,
): { subtotal: number; tax: number; total: number } {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );
  const tax = subtotal * taxRate;
  return {
    subtotal,
    tax,
    total: subtotal + tax,
  };
}

export type CreateOrderLineInput = {
  menuItemId: string;
  quantity: number;
  notes?: string | null;
};

export type MenuItemForOrder = {
  id: string;
  price: string;
  stockQuantity: number | null;
};

export type CreateOrderEvaluation =
  | {
      ok: false;
      status: 400 | 404;
      error: string;
      message: string;
    }
  | {
      ok: true;
      lineItems: Array<{
        menuItemId: string;
        quantity: number;
        notes: string | null | undefined;
        priceAtTime: string;
        subtotal: string;
      }>;
      subtotal: number;
      tax: number;
      total: number;
    };

export function evaluateCreateOrder(args: {
  customer: { id: string } | undefined;
  menuItems: MenuItemForOrder[];
  items: CreateOrderLineInput[];
  taxRate?: number;
  serviceAvailable?: boolean;
}): CreateOrderEvaluation {
  if (args.serviceAvailable === false) {
    return {
      ok: false,
      status: 400,
      error: "Bad Request",
      message: "Kitchen is currently closed",
    };
  }

  if (!args.customer) {
    return {
      ok: false,
      status: 404,
      error: "Not Found",
      message: "Customer not found",
    };
  }

  const menuItemIds = [...new Set(args.items.map((item) => item.menuItemId))];
  const foundIds = new Set(args.menuItems.map((item) => item.id));
  const missingIds = menuItemIds.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Bad Request",
      message: `Menu items not found: ${missingIds.join(", ")}`,
    };
  }

  const unavailableItems = args.menuItems.filter(
    (item) => menuItemIds.includes(item.id) && !availabilityFromStock(item.stockQuantity),
  );

  if (unavailableItems.length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Bad Request",
      message: `Menu items unavailable: ${unavailableItems
        .map((item) => item.id)
        .join(", ")}`,
    };
  }

  const itemsById = new Map(args.menuItems.map((item) => [item.id, item] as const));
  const lineItems = args.items.map((item) => {
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

  const totals = calculateOrderTotals(
    lineItems.map((item) => ({
      price: Number(item.priceAtTime),
      quantity: item.quantity,
    })),
    args.taxRate ?? 0.08,
  );

  return {
    ok: true,
    lineItems,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
  };
}
