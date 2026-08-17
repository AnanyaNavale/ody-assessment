import {
  getGetDashboardStatsQueryKey,
  getGetOrderQueryKey,
  getGetOrdersQueryKey,
  useGetOrder,
  useGetSettings,
  useUpdateOrderStatus,
  type UpdateOrderStatusStatus,
} from "@ody/api-client";
import { fonts } from "@ody/shared";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { type ComponentProps, type ReactNode, useRef } from "react";
import { canTransitionTo } from "../../lib/order-status";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
} from "react-native";

const palette = {
  page: "#ffe9e0",
  card: "#ffffff",
  ink: "#1a0800",
  muted: "#a07060",
  body: "#444444",
  dim: "#777777",
  axis: "#c0a898",
  red: "#d72400",
  kitchen: "#22c55e",
  down: "#dc2626",
  hairline: "#f0e8e4",
  itemLine: "#faf0eb",
  track: "#e5e7eb",
  inactive: "#9ca3af",
  cardBorder: "rgba(215, 36, 0, 0.06)",
  avatarBorder: "rgba(215, 36, 0, 0.15)",
  avatarBg: "#fff0ed",
  sidebarBorder: "rgba(215, 36, 0, 0.1)",
  tabInactive: "rgba(215, 36, 0, 0.55)",
  tabActiveBg: "#fff0ed",
};

const serif: TextStyle = {
  fontFamily: fonts.serif,
  color: palette.ink,
};

const sans: TextStyle = {
  fontFamily: fonts.sans,
  color: palette.ink,
};

const FLOW_STAGES = [
  { status: "pending", label: "Pending", icon: "time-outline" },
  { status: "preparing", label: "Preparing", icon: "flame-outline" },
  { status: "ready", label: "Ready", icon: "checkmark-outline" },
  { status: "completed", label: "Completed", icon: "checkmark-done-outline" },
] as const;

const NODE_SIZE = 52;
const ACTIVE_HALO = 62;

const STATUS_BADGE: Record<
  string,
  { background: string; color: string; icon: ComponentProps<typeof Ionicons>["name"] }
> = {
  pending: {
    background: "rgba(196, 122, 0, 0.1)",
    color: "#c47a00",
    icon: "time-outline",
  },
  preparing: {
    background: "rgba(245, 158, 11, 0.15)",
    color: "#F59E0B",
    icon: "flame-outline",
  },
  ready: {
    background: "rgba(123, 191, 199, 0.18)",
    color: "#7BBFC7",
    icon: "checkmark-circle-outline",
  },
  completed: {
    background: "rgba(34, 197, 94, 0.08)",
    color: "#16a34a",
    icon: "checkmark-outline",
  },
  cancelled: {
    background: "#E5E7EB",
    color: "#6b7280",
    icon: "close-outline",
  },
};

const NAV_ITEMS = [
  { href: "/(tabs)", label: "Home", icon: "home-outline" as const },
  { href: "/(tabs)/orders", label: "Orders", icon: "receipt-outline" as const },
  { href: "/(tabs)/menu", label: "Menu", icon: "restaurant-outline" as const },
  { href: "/(tabs)/crm", label: "Customers", icon: "people-outline" as const },
  { href: "/(tabs)/settings", label: "Settings", icon: "settings-outline" as const },
];

function orderNumber(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function formatMoney(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(amount)) {
    return `$${value}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatPlaced(value: string): string {
  const date = new Date(value);
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `Placed ${day} at ${time}`;
}

function formatDateShort(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function orderTypeLabel(orderType: string): string {
  if (orderType === "dine_in") {
    return "Dine-In";
  }

  if (orderType === "pickup") {
    return "Pickup";
  }

  if (orderType === "delivery") {
    return "Delivery";
  }

  return orderType;
}

function orderTypeIcon(orderType: string): ComponentProps<typeof Ionicons>["name"] {
  if (orderType === "pickup") {
    return "bag-outline";
  }

  if (orderType === "delivery") {
    return "car-outline";
  }

  return "restaurant-outline";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return (parts[0] ?? "").slice(0, 2).toUpperCase();
  }

  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function taxPercent(subtotal: string, tax: string): string {
  const base = Number(subtotal);
  const amount = Number(tax);

  if (!base || Number.isNaN(base) || Number.isNaN(amount)) {
    return "Tax";
  }

  return `Tax (${Math.round((amount / base) * 100)}%)`;
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const settingsQuery = useGetSettings();
  const kitchenOpen = settingsQuery.data?.serviceAvailable ?? true;
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const orderQuery = useGetOrder(id ?? "");
  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: async () => {
        if (!id) {
          return;
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(id) }),
          queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() }),
          queryClient.invalidateQueries({
            queryKey: getGetDashboardStatsQueryKey(),
          }),
        ]);
      },
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "Failed to update status";
        alert(message);
      },
    },
  });

  const order = orderQuery.data;
  const badge =
    (order ? STATUS_BADGE[order.status] : undefined) ?? {
      background: "rgba(196, 122, 0, 0.1)",
      color: "#c47a00",
      icon: "time-outline" as const,
    };
  const itemCount = order
    ? order.orderItems.reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  const guestLabel =
    order && order.customer.totalOrders > 1 ? "Regular Guest" : "Guest";
  const completedAt =
    order?.status === "completed"
      ? (order.completedAt ?? order.updatedAt)
      : null;
  const cancelledAt = order?.status === "cancelled" ? order.updatedAt : null;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.push("/(tabs)/orders");
  }

  function setStatus(status: UpdateOrderStatusStatus) {
    if (
      !order ||
      order.status === status ||
      updateStatus.isPending ||
      !canTransitionTo(order.status, status)
    ) {
      return;
    }

    updateStatus.mutate({ id: order.id, data: { status } });
  }

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: palette.page }}>
      <View
        style={{
          width: 220,
          backgroundColor: "#ffffff",
          borderRightWidth: 1,
          borderRightColor: palette.sidebarBorder,
        }}
      >
        <View style={{ paddingTop: 50 }}>
          {NAV_ITEMS.map((item) => {
            const focused = item.label === "Orders";

            return (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href as Href)}
                style={{
                  marginRight: 12,
                  backgroundColor: focused ? palette.tabActiveBg : "transparent",
                  borderTopRightRadius: 24,
                  borderBottomRightRadius: 24,
                  paddingVertical: 11,
                  paddingHorizontal: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  position: "relative",
                }}
              >
                {focused ? (
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 4,
                      width: 3,
                      height: 36,
                      borderTopRightRadius: 4,
                      borderBottomRightRadius: 4,
                      backgroundColor: palette.red,
                    }}
                  />
                ) : null}
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={focused ? palette.red : palette.tabInactive}
                />
                <Text
                  style={{
                    fontFamily: focused ? fonts.sansSemiBold : fonts.sans,
                    fontSize: 14,
                    lineHeight: 21,
                    color: focused ? palette.red : palette.tabInactive,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 32,
          paddingTop: 20,
          paddingBottom: 32,
          gap: 16,
        }}
      >
        <Pressable
          onPress={goBack}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Ionicons name="chevron-back" size={16} color={palette.muted} />
          <Text
            style={{
              ...sans,
              fontSize: 13,
              fontFamily: fonts.sansMedium,
              color: palette.muted,
            }}
          >
            Back to Orders
          </Text>
        </Pressable>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View>
            {orderQuery.isLoading ? (
              <Text style={{ ...sans, color: palette.muted }}>Loading order...</Text>
            ) : null}
            {orderQuery.isError || (!orderQuery.isLoading && !order) ? (
              <Text style={{ ...sans, color: palette.down }}>Order not found</Text>
            ) : null}
            {order ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text
                    style={{
                      ...serif,
                      fontSize: 26,
                      letterSpacing: -0.52,
                      lineHeight: 39,
                    }}
                  >
                    Order {orderNumber(order.id)}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      backgroundColor: badge.background,
                      borderRadius: 99,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                    }}
                  >
                    <Ionicons name={badge.icon} size={13} color={badge.color} />
                    <Text
                      style={{
                        ...sans,
                        fontSize: 13,
                        fontFamily: fonts.sansSemiBold,
                        color: badge.color,
                      }}
                    >
                      {statusLabel(order.status)}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 16,
                    marginTop: 6,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Ionicons name="time-outline" size={14} color={palette.muted} />
                    <Text style={{ ...sans, fontSize: 13, color: palette.muted }}>
                      {formatPlaced(order.createdAt)}
                    </Text>
                  </View>
                  {completedAt ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name="checkmark-outline" size={14} color="#16a34a" />
                      <Text style={{ ...sans, fontSize: 13, color: "#16a34a" }}>
                        Completed at {formatTime(completedAt)}
                      </Text>
                    </View>
                  ) : null}
                  {cancelledAt ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name="close-outline" size={14} color="#6b7280" />
                      <Text style={{ ...sans, fontSize: 13, color: "#6b7280" }}>
                        Cancelled at {formatTime(cancelledAt)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                backgroundColor: palette.card,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 2,
                shadowOffset: { width: 0, height: 1 },
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: kitchenOpen ? palette.kitchen : palette.down,
                }}
              />
              <Text
                style={{
                  ...sans,
                  fontSize: 13,
                  fontFamily: fonts.sansMedium,
                  color: "#333",
                }}
              >
                {kitchenOpen ? "Kitchen Open" : "Kitchen Closed"}
              </Text>
            </View>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: palette.red,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  ...sans,
                  color: "#fff",
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 14,
                }}
              >
                AN
              </Text>
            </View>
          </View>
        </View>

        {order ? (
          <>
            <Card overflowVisible>
              <CardHeader
                title="Order Progress"
                subtitle="Click any stage to update the order status"
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  paddingHorizontal: 20,
                  paddingVertical: 18,
                }}
              >
                {FLOW_STAGES.map((stage, index) => {
                  const currentIndex = FLOW_STAGES.findIndex(
                    (entry) => entry.status === order.status,
                  );
                  const reached =
                    order.status !== "cancelled" &&
                    currentIndex >= 0 &&
                    index <= currentIndex;
                  const active = order.status === stage.status;
                  const canSelect = canTransitionTo(order.status, stage.status);
                  const segmentComplete =
                    order.status !== "cancelled" && currentIndex > index;

                  return (
                    <View
                      key={stage.status}
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "flex-start",
                      }}
                    >
                      <ProgressNode
                        label={stage.label}
                        icon={stage.icon}
                        reached={reached}
                        active={active}
                        canSelect={canSelect && !updateStatus.isPending}
                        onPress={() => {
                          if (canSelect) {
                            setStatus(stage.status);
                          }
                        }}
                      />
                      {index < FLOW_STAGES.length - 1 ? (
                        <View
                          style={{
                            flex: 1,
                            height: 0,
                            marginTop: NODE_SIZE / 2,
                            marginHorizontal: 4,
                            borderTopWidth: 2,
                            borderStyle: "dashed",
                            borderColor: segmentComplete ? palette.red : palette.track,
                          }}
                        />
                      ) : null}
                    </View>
                  );
                })}
                <View
                  style={{
                    width: 1,
                    height: 56,
                    backgroundColor: palette.hairline,
                    marginTop: 10,
                    marginHorizontal: 20,
                  }}
                />
                <ProgressNode
                  label="Cancelled"
                  icon="close-outline"
                  reached={order.status === "cancelled"}
                  active={order.status === "cancelled"}
                  fill={order.status === "cancelled" ? "#6b7280" : palette.red}
                  canSelect={
                    !updateStatus.isPending &&
                    canTransitionTo(order.status, "cancelled")
                  }
                  onPress={() => {
                    if (canTransitionTo(order.status, "cancelled")) {
                      setStatus("cancelled");
                    }
                  }}
                />
              </View>
            </Card>

            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <View style={{ flexGrow: 1, flexBasis: 520, minWidth: 320, gap: 16 }}>
                <Card>
                  <CardHeader title="Customer" />
                  <View style={{ paddingHorizontal: 22, paddingVertical: 16, gap: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: palette.avatarBg,
                          borderWidth: 1,
                          borderColor: palette.avatarBorder,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            ...sans,
                            fontSize: 15,
                            fontFamily: fonts.sansBold,
                            color: palette.red,
                          }}
                        >
                          {initials(order.customer.name)}
                        </Text>
                      </View>
                      <View>
                        <Text
                          style={{
                            ...sans,
                            fontSize: 15,
                            fontFamily: fonts.sansBold,
                          }}
                        >
                          {order.customer.name}
                        </Text>
                        <Text style={{ ...sans, fontSize: 12, color: palette.muted }}>
                          {guestLabel}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 12,
                        borderTopWidth: 1,
                        borderTopColor: palette.itemLine,
                        paddingTop: 12,
                      }}
                    >
                      <MetaBlock label="Email" value={order.customer.email} />
                      <MetaBlock
                        label="Phone"
                        value={order.customer.phone ?? "No phone"}
                      />
                      <View style={{ flexGrow: 1, flexBasis: 160, minWidth: 140 }}>
                        <Text
                          style={{
                            ...sans,
                            fontSize: 10,
                            fontFamily: fonts.sansBold,
                            color: palette.axis,
                            letterSpacing: 0.7,
                            textTransform: "uppercase",
                          }}
                        >
                          Order Type
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            marginTop: 4,
                          }}
                        >
                          <Ionicons
                            name={orderTypeIcon(order.orderType)}
                            size={14}
                            color="#333"
                          />
                          <Text
                            style={{
                              ...sans,
                              fontSize: 13,
                              fontFamily: fonts.sansMedium,
                              color: "#333",
                            }}
                          >
                            {orderTypeLabel(order.orderType)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Card>

                <Card>
                  <CardHeader
                    title="Items Ordered"
                    subtitle={`${itemCount} ${itemCount === 1 ? "item" : "items"}`}
                  />
                  <View>
                    {order.orderItems.map((item, index) => {
                      const imageUrl = item.menuItem.imageUrl;

                      return (
                        <View
                          key={item.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 14,
                            paddingHorizontal: 22,
                            paddingVertical: 13,
                            borderBottomWidth:
                              index === order.orderItems.length - 1 ? 0 : 1,
                            borderBottomColor: palette.itemLine,
                          }}
                        >
                          <View
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: 10,
                              backgroundColor: "#f5ede8",
                              overflow: "hidden",
                            }}
                          >
                            {imageUrl ? (
                              <Image
                                source={{ uri: imageUrl }}
                                style={{ width: 52, height: 52 }}
                              />
                            ) : (
                              <View
                                style={{
                                  flex: 1,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Ionicons
                                  name="fast-food-outline"
                                  size={20}
                                  color={palette.axis}
                                />
                              </View>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                ...sans,
                                fontSize: 13,
                                fontFamily: fonts.sansSemiBold,
                              }}
                            >
                              {item.menuItem.name}
                            </Text>
                            <Text
                              style={{
                                ...sans,
                                fontSize: 12,
                                color: "#b09080",
                                marginTop: 3,
                              }}
                            >
                              {item.quantity} × {formatMoney(item.priceAtTime)}
                            </Text>
                          </View>
                          <Text
                            style={{
                              ...sans,
                              fontSize: 14,
                              fontFamily: fonts.sansBold,
                            }}
                          >
                            {formatMoney(item.subtotal)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              </View>

              <View style={{ width: 340, flexGrow: 1, flexBasis: 280, gap: 16 }}>
                <Card>
                  <CardHeader title="Order Summary" />
                  <View style={{ paddingHorizontal: 22, paddingVertical: 16 }}>
                    <SummaryRow label="Subtotal" value={formatMoney(order.subtotal)} />
                    <SummaryRow
                      label={taxPercent(order.subtotal, order.tax)}
                      value={formatMoney(order.tax)}
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingTop: 12,
                      }}
                    >
                      <Text
                        style={{
                          ...sans,
                          fontSize: 15,
                          fontFamily: fonts.sansBold,
                        }}
                      >
                        Total
                      </Text>
                      <Text
                        style={{
                          ...sans,
                          fontSize: 18,
                          fontFamily: fonts.sansBold,
                          color: palette.red,
                        }}
                      >
                        {formatMoney(order.total)}
                      </Text>
                    </View>
                  </View>
                </Card>

                <Card>
                  <CardHeader title="Order Details" />
                  <View style={{ paddingHorizontal: 22, paddingVertical: 14 }}>
                    <DetailRow
                      icon="receipt-outline"
                      label="Order ID"
                      value={orderNumber(order.id)}
                    />
                    <DetailRow
                      icon="calendar-outline"
                      label="Date"
                      value={formatDateShort(order.createdAt)}
                    />
                    <DetailRow
                      icon="time-outline"
                      label="Placed at"
                      value={formatTime(order.createdAt)}
                    />
                    {completedAt ? (
                      <DetailRow
                        icon="checkmark-outline"
                        label="Completed"
                        value={formatTime(completedAt)}
                      />
                    ) : null}
                    {cancelledAt ? (
                      <DetailRow
                        icon="close-outline"
                        label="Cancelled"
                        value={formatTime(cancelledAt)}
                      />
                    ) : null}
                    <DetailRow
                      icon={orderTypeIcon(order.orderType)}
                      label="Type"
                      value={orderTypeLabel(order.orderType)}
                      last={false}
                    />
                    <View style={{ paddingTop: 12, gap: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="document-text-outline" size={15} color={palette.dim} />
                        <Text style={{ ...sans, fontSize: 13, color: palette.dim }}>
                          Notes
                        </Text>
                      </View>
                      <View
                        style={{
                          minHeight: 72,
                          borderRadius: 10,
                          backgroundColor: "#fffaf8",
                          borderWidth: 1,
                          borderColor: palette.hairline,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                        }}
                      >
                        <Text
                          style={{
                            ...sans,
                            fontSize: 13,
                            color: order.notes ? palette.body : palette.inactive,
                            lineHeight: 19,
                          }}
                        >
                          {order.notes?.trim() ? order.notes : "No order notes"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Card({
  children,
  overflowVisible = false,
}: {
  children: ReactNode;
  overflowVisible?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: palette.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.cardBorder,
        overflow: overflowVisible ? "visible" : "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        width: "100%",
      }}
    >
      {children}
    </View>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 22,
        paddingTop: 16,
        paddingBottom: 13,
        borderBottomWidth: 1,
        borderBottomColor: palette.hairline,
      }}
    >
      <Text style={{ ...serif, fontSize: 16, lineHeight: 24 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ ...sans, fontSize: 12, color: "#b09080", marginTop: 2 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function ProgressNode({
  label,
  icon,
  reached,
  active,
  fill = palette.red,
  canSelect,
  onPress,
}: {
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  reached: boolean;
  active: boolean;
  fill?: string;
  canSelect: boolean;
  onPress: () => void;
}) {
  const hover = useRef(new Animated.Value(0)).current;
  const past = reached && !active;

  function fadeHover(toValue: number) {
    if (!canSelect || active || reached) {
      return;
    }

    Animated.timing(hover, {
      toValue,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!canSelect}
      onHoverIn={() => fadeHover(1)}
      onHoverOut={() => {
        Animated.timing(hover, {
          toValue: 0,
          duration: 180,
          useNativeDriver: false,
        }).start();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ alignItems: "center" }}
    >
      <View
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {active ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: ACTIVE_HALO,
              height: ACTIVE_HALO,
              borderRadius: ACTIVE_HALO / 2,
              backgroundColor: "rgba(215, 36, 0, 0.14)",
            }}
          />
        ) : null}
        <Animated.View
          style={{
            width: NODE_SIZE,
            height: NODE_SIZE,
            borderRadius: NODE_SIZE / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: reached ? fill : "#ffffff",
            borderWidth: 2,
            borderColor: reached
              ? fill
              : hover.interpolate({
                  inputRange: [0, 1],
                  outputRange: [palette.track, "rgba(215, 36, 0, 0.45)"],
                }),
            opacity: past ? 0.7 : 1,
          }}
        >
          <Ionicons
            name={icon}
            size={22}
            color={reached ? "#ffffff" : palette.inactive}
          />
        </Animated.View>
      </View>
      <Text
        style={{
          ...sans,
          fontSize: 12,
          fontFamily: active ? fonts.sansBold : fonts.sans,
          color: active ? palette.ink : past ? "rgba(26, 8, 0, 0.42)" : palette.inactive,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: 160, minWidth: 140 }}>
      <Text
        style={{
          ...sans,
          fontSize: 10,
          fontFamily: fonts.sansBold,
          color: palette.axis,
          letterSpacing: 0.7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          ...sans,
          fontSize: 13,
          fontFamily: fonts.sansMedium,
          color: "#333",
          marginTop: 4,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: palette.itemLine,
      }}
    >
      <Text style={{ ...sans, fontSize: 13, color: palette.dim }}>{label}</Text>
      <Text style={{ ...sans, fontSize: 13, color: "#333" }}>{value}</Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.itemLine,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon} size={15} color={palette.dim} />
        <Text style={{ ...sans, fontSize: 13, color: palette.dim }}>{label}</Text>
      </View>
      <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansSemiBold }}>{value}</Text>
    </View>
  );
}
