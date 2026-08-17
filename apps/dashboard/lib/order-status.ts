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

export function isOrderStatus(value: string): value is OrderStatusValue {
  return ORDER_STATUSES.some((status) => status === value);
}

export function canTransitionTo(currentStatus: string, nextStatus: string): boolean {
  if (!isOrderStatus(currentStatus) || !isOrderStatus(nextStatus)) {
    return false;
  }

  return ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function nextStatusFor(
  status: string,
): "preparing" | "ready" | "completed" | null {
  if (status === "pending") {
    return "preparing";
  }

  if (status === "preparing") {
    return "ready";
  }

  if (status === "ready") {
    return "completed";
  }

  return null;
}

export function canCreateOrder(kitchenOpen: boolean): boolean {
  return kitchenOpen;
}
