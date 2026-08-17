import {
  useGetCustomer,
  useGetOrders,
  useGetSettings,
  type OrderWithDetails,
} from "@ody/api-client";
import { fonts } from "@ody/shared";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMemo, useState, type ComponentProps } from "react";
import {
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
  dim: "#777777",
  red: "#d72400",
  kitchen: "#22c55e",
  down: "#dc2626",
  hairline: "#f0e8e4",
  cardBorder: "rgba(215, 36, 0, 0.06)",
  controlBorder: "rgba(215, 36, 0, 0.15)",
  redSoft: "rgba(215, 36, 0, 0.09)",
  tabTrack: "#fff5f2",
  value: "#555555",
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

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "highest", label: "Highest value" },
  { value: "lowest", label: "Lowest value" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];
type HistoryView = "grid" | "list";

const GRID_CARD_WIDTH = 280;

const LIST_COLUMNS = [
  { label: "#", flex: 0.45 },
  { label: "Order", flex: 1.1 },
  { label: "Date", flex: 0.95 },
  { label: "Items", width: 168, paddingRight: 28 },
  { label: "Type", flex: 1.1 },
  { label: "Total", flex: 0.9 },
  { label: "Status", flex: 1.2 },
] as const;

function sortOrders(orders: OrderWithDetails[], sort: SortOption): OrderWithDetails[] {
  return [...orders].sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    if (sort === "highest") {
      return Number(b.total) - Number(a.total);
    }

    if (sort === "lowest") {
      return Number(a.total) - Number(b.total);
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function favoriteDishes(
  orders: OrderWithDetails[],
): Array<{ name: string; count: number; imageUrl: string | null }> {
  const counts = new Map<string, { name: string; count: number; imageUrl: string | null }>();

  for (const order of orders) {
    for (const item of order.orderItems) {
      const key = item.menuItem.id;
      const existing = counts.get(key);
      const nextCount = (existing?.count ?? 0) + item.quantity;

      counts.set(key, {
        name: item.menuItem.name,
        count: nextCount,
        imageUrl: item.menuItem.imageUrl ?? existing?.imageUrl ?? null,
      });
    }
  }

  const ranked = [...counts.values()].sort((a, b) => b.count - a.count);
  const topCount = ranked[0]?.count ?? 0;

  if (topCount === 0) {
    return [];
  }

  return ranked.filter((dish) => dish.count === topCount);
}

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

export default function CustomerDetailScreen() {
  const router = useRouter();
  const settingsQuery = useGetSettings();
  const kitchenOpen = settingsQuery.data?.serviceAvailable ?? true;
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const customerQuery = useGetCustomer(id ?? "");
  const ordersQuery = useGetOrders(
    {
      customerId: id,
      dateFilter: "all",
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 100,
    },
    { query: { enabled: Boolean(id) } },
  );
  const [sort, setSort] = useState<SortOption>("newest");
  const [historyView, setHistoryView] = useState<HistoryView>("grid");

  const customer = customerQuery.data;
  const orders = useMemo(
    () => sortOrders(ordersQuery.data?.items ?? [], sort),
    [ordersQuery.data?.items, sort],
  );
  const chronological = useMemo(
    () =>
      [...(ordersQuery.data?.items ?? [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [ordersQuery.data?.items],
  );
  const favorites = useMemo(
    () => favoriteDishes(ordersQuery.data?.items ?? []),
    [ordersQuery.data?.items],
  );
  const firstOrder = chronological[0];
  const lastOrder = chronological[chronological.length - 1];
  const averageOrderValue =
    customer && customer.totalOrders > 0
      ? Number(customer.totalSpent) / customer.totalOrders
      : 0;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.push("/(tabs)/crm");
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
            const focused = item.label === "Customers";

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
          paddingTop: 28,
          paddingBottom: 32,
          gap: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View>
            <Pressable
              onPress={goBack}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 6 }}
            >
              <Ionicons name="chevron-back" size={15} color={palette.muted} />
              <Text
                style={{
                  ...sans,
                  fontSize: 13,
                  fontFamily: fonts.sansMedium,
                  color: palette.muted,
                }}
              >
                Customers
              </Text>
            </Pressable>
            {customerQuery.isLoading ? (
              <Text style={{ ...sans, color: palette.muted }}>Loading customer...</Text>
            ) : null}
            {customerQuery.isError || (!customerQuery.isLoading && !customer) ? (
              <Text style={{ ...sans, color: palette.down }}>Customer not found</Text>
            ) : null}
            {customer ? (
              <Text style={{ ...serif, fontSize: 28, letterSpacing: -0.56, lineHeight: 42 }}>
                {customer.name}
              </Text>
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
              <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansMedium, color: "#333" }}>
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
              <Text style={{ ...sans, color: "#fff", fontFamily: fonts.sansSemiBold, fontSize: 14 }}>
                AN
              </Text>
            </View>
          </View>
        </View>

        {customer ? (
          <>
            <View
              style={{
                backgroundColor: palette.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: palette.cardBorder,
                paddingHorizontal: 28,
                paddingVertical: 24,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 28,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 2,
                shadowOffset: { width: 0, height: 1 },
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "rgba(215, 36, 0, 0.09)",
                  borderWidth: 2,
                  borderColor: "rgba(215, 36, 0, 0.19)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ ...sans, fontSize: 22, fontFamily: fonts.sansBold, color: palette.red }}>
                  {initials(customer.name)}
                </Text>
              </View>

              <View style={{ flexGrow: 1, flexBasis: 280, minWidth: 220, gap: 10 }}>
                <Text style={{ ...sans, fontSize: 18, fontFamily: fonts.sansBold, lineHeight: 27 }}>
                  {customer.name}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, rowGap: 12 }}>
                  <Meta icon="mail-outline" text={customer.email} />
                  <Meta icon="call-outline" text={customer.phone ?? "No phone"} />
                  <Meta
                    icon="calendar-outline"
                    text={`First visit ${firstOrder ? formatDateShort(firstOrder.createdAt) : "—"}`}
                  />
                  <Meta
                    icon="time-outline"
                    text={`Last visit ${lastOrder ? formatDateShort(lastOrder.createdAt) : "—"}`}
                  />
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "stretch",
                  borderLeftWidth: 1,
                  borderLeftColor: palette.hairline,
                  paddingLeft: 28,
                }}
              >
                <StatBlock
                  label="Orders Placed"
                  value={String(customer.totalOrders)}
                  icon="receipt-outline"
                  iconBackground="rgba(215, 36, 0, 0.09)"
                  iconColor={palette.red}
                />
                <View style={{ width: 1, backgroundColor: palette.hairline, marginHorizontal: 28 }} />
                <StatBlock
                  label="Total Spent"
                  value={formatMoney(customer.totalSpent)}
                  icon="wallet-outline"
                  iconBackground="rgba(22, 163, 74, 0.09)"
                  iconColor="#16a34a"
                />
                <View style={{ width: 1, backgroundColor: palette.hairline, marginHorizontal: 28 }} />
                <StatBlock
                  label="Avg. Order"
                  value={formatMoney(averageOrderValue)}
                  icon="trending-up"
                  iconBackground="rgba(123, 191, 199, 0.12)"
                  iconColor="#7BBFC7"
                />
                <View style={{ width: 1, backgroundColor: palette.hairline, marginHorizontal: 28 }} />
                <FavoriteBlock dishes={favorites} />
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                zIndex: 40,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
                <Text style={{ ...serif, fontSize: 22, letterSpacing: -0.4 }}>Order History</Text>
                <Text style={{ ...sans, fontSize: 13, color: palette.red }}>
                  {customer.totalOrders} {customer.totalOrders === 1 ? "order" : "orders"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <FilterMenu
                  prefix="Sort:"
                  options={SORT_OPTIONS}
                  selected={sort}
                  onSelect={setSort}
                />
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: palette.tabTrack,
                    borderRadius: 99,
                    padding: 4,
                    gap: 2,
                  }}
                >
                  <ViewToggle
                    icon="grid-outline"
                    selected={historyView === "grid"}
                    onPress={() => setHistoryView("grid")}
                  />
                  <ViewToggle
                    icon="list-outline"
                    selected={historyView === "list"}
                    onPress={() => setHistoryView("list")}
                  />
                </View>
              </View>
            </View>

            {ordersQuery.isLoading ? (
              <Text style={{ ...sans, color: palette.muted }}>Loading orders...</Text>
            ) : null}

            {!ordersQuery.isLoading && orders.length === 0 ? (
              <Text style={{ ...sans, fontSize: 14, color: palette.dim }}>No orders yet</Text>
            ) : null}

            {historyView === "grid" ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
                {orders.map((order) => (
                  <OrderHistoryCard
                    key={order.id}
                    order={order}
                    onPress={() => router.push(`/orders/${order.id}`)}
                  />
                ))}
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: palette.card,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: palette.cardBorder,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    backgroundColor: "#faf7f5",
                    borderBottomWidth: 1,
                    borderBottomColor: palette.hairline,
                  }}
                >
                  {LIST_COLUMNS.map((column) => (
                    <Text
                      key={column.label}
                      style={{
                        ...sans,
                        fontSize: 11,
                        fontFamily: fonts.sansSemiBold,
                        color: palette.muted,
                        letterSpacing: 0.4,
                        textTransform: "uppercase",
                        ...("width" in column ? { width: column.width } : { flex: column.flex }),
                        ...("paddingRight" in column ? { paddingRight: column.paddingRight } : {}),
                      }}
                    >
                      {column.label}
                    </Text>
                  ))}
                </View>
                {orders.map((order, index) => (
                  <OrderHistoryRow
                    key={order.id}
                    index={index + 1}
                    order={order}
                    onPress={() => router.push(`/orders/${order.id}`)}
                  />
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Meta({
  icon,
  text,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  text: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
      <Ionicons name={icon} size={14} color={palette.muted} />
      <Text style={{ ...sans, fontSize: 13, color: "#555" }}>{text}</Text>
    </View>
  );
}

function StatBlock({
  label,
  value,
  icon,
  iconBackground,
  iconColor,
}: {
  label: string;
  value: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  iconBackground: string;
  iconColor: string;
}) {
  return (
    <View style={{ minWidth: 120, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            backgroundColor: iconBackground,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={11} color={iconColor} />
        </View>
        <Text
          style={{
            ...sans,
            fontSize: 11,
            fontFamily: fonts.sansSemiBold,
            color: palette.muted,
            letterSpacing: 0.77,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
      </View>
      <Text style={{ ...serif, fontSize: 22, letterSpacing: -0.44, lineHeight: 33 }}>{value}</Text>
    </View>
  );
}

function FavoriteBlock({
  dishes,
}: {
  dishes: Array<{ name: string; count: number; imageUrl: string | null }>;
}) {
  return (
    <View style={{ minWidth: 160, maxWidth: 240, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            backgroundColor: "rgba(196, 122, 0, 0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="star-outline" size={11} color="#c47a00" />
        </View>
        <Text
          style={{
            ...sans,
            fontSize: 11,
            fontFamily: fonts.sansSemiBold,
            color: palette.muted,
            letterSpacing: 0.77,
            textTransform: "uppercase",
          }}
        >
          {dishes.length > 1 ? "Favorite Dishes" : "Favorite Dish"}
        </Text>
      </View>
      {dishes.length === 0 ? (
        <Text style={{ ...serif, fontSize: 22, letterSpacing: -0.44, lineHeight: 33 }}>—</Text>
      ) : (
        <View style={{ gap: 6, paddingTop: 2 }}>
          {dishes.map((dish) => (
            <View key={dish.name} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {dish.imageUrl ? (
                <Image
                  source={{ uri: dish.imageUrl }}
                  style={{ width: 22, height: 22, borderRadius: 6 }}
                />
              ) : (
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: palette.tabTrack,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="restaurant-outline" size={11} color={palette.muted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ ...sans, fontSize: 13, fontFamily: fonts.sansSemiBold }}>
                  {dish.name}
                </Text>
                <Text style={{ ...sans, fontSize: 11, color: palette.muted }}>
                  {dish.count} {dish.count === 1 ? "order" : "orders"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const dropdownTrigger = {
  backgroundColor: palette.card,
  borderColor: palette.controlBorder,
  borderWidth: 1,
  borderRadius: 99,
  paddingVertical: 9,
  paddingHorizontal: 16,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 6,
  shadowColor: "#1a0800",
  shadowOpacity: 0.06,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 2,
  boxShadow: "0 1px 2px rgba(26, 8, 0, 0.06)",
};

const dropdownPanel = {
  position: "absolute" as const,
  top: 44,
  right: 0,
  minWidth: 176,
  backgroundColor: palette.card,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.controlBorder,
  overflow: "hidden" as const,
  shadowColor: "#1a0800",
  shadowOpacity: 0.14,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 12,
  zIndex: 9999,
  boxShadow: "0 8px 24px rgba(26, 8, 0, 0.14)",
};

function FilterMenu<T extends string>({
  prefix,
  options,
  selected,
  onSelect,
}: {
  prefix: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === selected)?.label ?? selected;

  return (
    <View style={{ position: "relative", zIndex: open ? 80 : 1, elevation: open ? 30 : 1 }}>
      <Pressable onPress={() => setOpen((current) => !current)} style={dropdownTrigger}>
        <Text style={{ ...sans, fontSize: 13, color: palette.muted }}>{prefix}</Text>
        <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansMedium, color: palette.value }}>
          {selectedLabel}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={13} color={palette.red} />
      </Pressable>
      {open ? (
        <View style={dropdownPanel}>
          {options.map((option) => {
            const isSelected = selected === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
                  setOpen(false);
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  backgroundColor: isSelected ? palette.redSoft : palette.card,
                }}
              >
                <Text
                  style={{
                    ...sans,
                    fontSize: 13,
                    color: isSelected ? palette.red : palette.ink,
                    fontFamily: isSelected ? fonts.sansSemiBold : fonts.sans,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function ViewToggle({
  icon,
  selected,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 36,
        height: 32,
        borderRadius: 99,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? palette.red : "transparent",
      }}
    >
      <Ionicons name={icon} size={16} color={selected ? "#ffffff" : palette.muted} />
    </Pressable>
  );
}

function OrderHistoryCard({
  order,
  onPress,
}: {
  order: OrderWithDetails;
  onPress: () => void;
}) {
  const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE.pending;
  const images = order.orderItems
    .map((item) => item.menuItem.imageUrl)
    .filter((url): url is string => Boolean(url));
  const uniqueImages = [...new Set(images)];
  const visible = uniqueImages.slice(0, 4);
  const extra = uniqueImages.length - visible.length;

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: GRID_CARD_WIDTH,
        flexGrow: 0,
        flexShrink: 0,
        backgroundColor: palette.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.cardBorder,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      <View
        style={{
          flexDirection: "row",
          height: 88,
          backgroundColor: "#fff5f2",
        }}
      >
        {visible.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="fast-food-outline" size={22} color={palette.muted} />
          </View>
        ) : (
          visible.map((url, index) => (
            <Image
              key={`${url}-${index}`}
              source={{ uri: url }}
              style={{ flex: 1, height: "100%" }}
              resizeMode="cover"
            />
          ))
        )}
        {extra > 0 ? (
          <View
            style={{
              width: 48,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#fff0ed",
            }}
          >
            <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansSemiBold, color: palette.red }}>
              +{extra}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10, minHeight: 96 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ gap: 4 }}>
            <Text style={{ ...sans, fontSize: 15, fontFamily: fonts.sansBold, color: palette.red }}>
              {orderNumber(order.id)}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="time-outline" size={13} color={palette.muted} />
              <Text style={{ ...sans, fontSize: 12, color: "#555" }}>
                {formatDateShort(order.createdAt)} • {formatTime(order.createdAt)}
              </Text>
            </View>
          </View>
          <Text style={{ ...serif, fontSize: 20, letterSpacing: -0.4 }}>
            {formatMoney(order.total)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name={orderTypeIcon(order.orderType)} size={13} color="#555" />
            <Text style={{ ...sans, fontSize: 12, fontFamily: fonts.sansMedium, color: "#555" }}>
              {orderTypeLabel(order.orderType)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: badge.background,
              borderRadius: 99,
              paddingHorizontal: 9,
              paddingVertical: 3,
            }}
          >
            <Ionicons name={badge.icon} size={11} color={badge.color} />
            <Text
              style={{
                ...sans,
                fontSize: 11,
                fontFamily: fonts.sansSemiBold,
                color: badge.color,
              }}
            >
              {statusLabel(order.status)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function OrderHistoryRow({
  index,
  order,
  onPress,
}: {
  index: number;
  order: OrderWithDetails;
  onPress: () => void;
}) {
  const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE.pending;
  const items = order.orderItems;
  const visible = items.slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: palette.hairline,
        minHeight: 64,
      }}
    >
      <Text
        style={{
          flex: LIST_COLUMNS[0].flex,
          ...sans,
          fontSize: 12,
          fontFamily: fonts.sansMedium,
          color: palette.muted,
        }}
      >
        {index}
      </Text>
      <Text
        style={{
          flex: LIST_COLUMNS[1].flex,
          ...sans,
          fontSize: 13,
          fontFamily: fonts.sansBold,
          color: palette.red,
        }}
      >
        {orderNumber(order.id)}
      </Text>
      <View style={{ flex: LIST_COLUMNS[2].flex, gap: 1 }}>
        <Text style={{ ...sans, fontSize: 12, color: "#555" }}>{formatDateShort(order.createdAt)}</Text>
        <Text style={{ ...sans, fontSize: 11, color: palette.muted }}>{formatTime(order.createdAt)}</Text>
      </View>
      <View
        style={{
          width: LIST_COLUMNS[3].width,
          paddingRight: LIST_COLUMNS[3].paddingRight,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        {visible.length === 0 ? (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: palette.tabTrack,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="fast-food-outline" size={16} color={palette.muted} />
          </View>
        ) : (
          visible.map((item) =>
            item.menuItem.imageUrl ? (
              <Image
                key={item.id}
                source={{ uri: item.menuItem.imageUrl }}
                style={{ width: 36, height: 36, borderRadius: 8 }}
              />
            ) : (
              <View
                key={item.id}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: palette.tabTrack,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="restaurant-outline" size={14} color={palette.muted} />
              </View>
            ),
          )
        )}
        {hasMore ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: palette.tabTrack,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="add" size={14} color={palette.red} />
          </View>
        ) : null}
      </View>
      <View
        style={{
          flex: LIST_COLUMNS[4].flex,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Ionicons name={orderTypeIcon(order.orderType)} size={13} color="#555" />
        <Text style={{ ...sans, fontSize: 12, fontFamily: fonts.sansMedium, color: "#555" }}>
          {orderTypeLabel(order.orderType)}
        </Text>
      </View>
      <Text
        style={{
          flex: LIST_COLUMNS[5].flex,
          ...sans,
          fontSize: 13,
          fontFamily: fonts.sansSemiBold,
        }}
      >
        {formatMoney(order.total)}
      </Text>
      <View style={{ flex: LIST_COLUMNS[6].flex, alignItems: "flex-start" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: badge.background,
            borderRadius: 99,
            paddingHorizontal: 9,
            paddingVertical: 3,
          }}
        >
          <Ionicons name={badge.icon} size={11} color={badge.color} />
          <Text
            style={{
              ...sans,
              fontSize: 11,
              fontFamily: fonts.sansSemiBold,
              color: badge.color,
            }}
          >
            {statusLabel(order.status)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
