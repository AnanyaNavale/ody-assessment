import {
  useGetDashboardStats,
  useGetOrders,
  useGetSettings,
  type GetOrdersDateFilter,
  type GetOrdersSortBy,
  type GetOrdersSortOrder,
  type GetOrdersStatus,
  type OrderWithDetails,
} from "@ody/api-client";
import { fonts } from "@ody/shared";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextStyle,
} from "react-native";

const PAGE_SIZE = 20;

const palette = {
  page: "#ffe9e0",
  card: "#ffffff",
  ink: "#1a0800",
  muted: "#a07060",
  body: "#444444",
  dim: "#777777",
  red: "#d72400",
  redSoft: "rgba(215, 36, 0, 0.09)",
  teal: "#7bbfc7",
  tealSoft: "rgba(123, 191, 199, 0.09)",
  gold: "#c47a00",
  goldSoft: "rgba(196, 122, 0, 0.09)",
  green: "#16a34a",
  greenSoft: "rgba(22, 163, 74, 0.09)",
  kitchen: "#22c55e",
  down: "#dc2626",
  hairline: "#f0e8e4",
  track: "#f5ede8",
  tabTrack: "#fff5f2",
  controlBorder: "rgba(215, 36, 0, 0.15)",
  value: "#555555",
};

const serif: TextStyle = {
  fontFamily: fonts.serif,
  color: palette.ink,
};

const sans: TextStyle = {
  fontFamily: fonts.sans,
  color: palette.ink,
};

const STATUS_FILTERS = [
  "all",
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

const SORT_OPTIONS = [
  { value: "oldest", label: "Oldest First" },
  { value: "newest", label: "Newest First" },
  { value: "highest", label: "Highest value" },
  { value: "lowest", label: "Lowest value" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

const DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "all", label: "All time" },
] as const;

type DateOption = (typeof DATE_OPTIONS)[number]["value"];

const ORDER_TYPES = [
  { value: "dine_in", label: "Dine-In" },
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
] as const;

type OrderTypeValue = (typeof ORDER_TYPES)[number]["value"];

const STATUS_PILL: Record<
  string,
  { background: string; color: string; icon: ComponentProps<typeof Ionicons>["name"] }
> = {
  pending: { background: "#fef3c7", color: "#92400e", icon: "time-outline" },
  preparing: { background: "#dbeafe", color: "#1e40af", icon: "flame-outline" },
  ready: { background: "#d1fae5", color: "#065f46", icon: "checkmark-circle-outline" },
  completed: { background: "#f3f4f6", color: "#374151", icon: "checkmark-outline" },
  cancelled: { background: "#fee2e2", color: "#991b1b", icon: "close-outline" },
};

function firstParam(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function orderNumber(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
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

function orderTypeIcon(
  orderType: string,
): ComponentProps<typeof Ionicons>["name"] {
  if (orderType === "pickup") {
    return "bag-handle-outline";
  }

  if (orderType === "delivery") {
    return "bicycle-outline";
  }

  return "restaurant-outline";
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

function formatRowDate(value: string): { date: string; time: string } {
  const parsed = new Date(value);

  return {
    date: parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: parsed.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

function todayLabel(): string {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

function itemCount(order: OrderWithDetails): number {
  return order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(dayStart: number): string {
  const today = startOfLocalDay(new Date());
  const yesterday = today - 24 * 60 * 60 * 1000;

  if (dayStart === today) {
    return "Today";
  }

  if (dayStart === yesterday) {
    return "Yesterday";
  }

  return new Date(dayStart).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function groupOrdersByDay(
  orders: OrderWithDetails[],
  oldestFirst: boolean,
): Array<{ key: number; label: string; orders: OrderWithDetails[] }> {
  const groups = new Map<number, OrderWithDetails[]>();

  for (const order of orders) {
    const key = startOfLocalDay(new Date(order.createdAt));
    const existing = groups.get(key) ?? [];
    existing.push(order);
    groups.set(key, existing);
  }

  const keys = [...groups.keys()].sort((a, b) => (oldestFirst ? a - b : b - a));

  return keys.map((key) => ({
    key,
    label: dayLabel(key),
    orders: groups.get(key) ?? [],
  }));
}

function sortQuery(sort: SortOption): {
  sortBy: GetOrdersSortBy;
  sortOrder: GetOrdersSortOrder;
} {
  if (sort === "newest") {
    return { sortBy: "createdAt", sortOrder: "desc" };
  }

  if (sort === "highest") {
    return { sortBy: "total", sortOrder: "desc" };
  }

  if (sort === "lowest") {
    return { sortBy: "total", sortOrder: "asc" };
  }

  return { sortBy: "createdAt", sortOrder: "asc" };
}

function defaultSort(tab: StatusFilter): SortOption {
  if (tab === "pending" || tab === "preparing" || tab === "ready") {
    return "oldest";
  }

  return "newest";
}

function parseSort(value?: string): SortOption | undefined {
  if (SORT_OPTIONS.some((option) => option.value === value)) {
    return value as SortOption;
  }

  return undefined;
}

function smartDateFilter(tab: StatusFilter): DateOption {
  return tab === "all" ? "all" : "today";
}

const OPEN_STATUSES = ["pending", "preparing", "ready"] as const;

function isOpenStatus(status: string): boolean {
  return OPEN_STATUSES.some((value) => value === status);
}

function isOverdue(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000;
}

function overdueLabel(createdAt: string): string | null {
  if (!isOverdue(createdAt)) {
    return null;
  }

  const placedDay = startOfLocalDay(new Date(createdAt));
  const yesterday = startOfLocalDay(new Date()) - 24 * 60 * 60 * 1000;

  if (placedDay === yesterday) {
    return "Placed yesterday";
  }

  return "Overdue";
}

function parseTypes(value?: string): OrderTypeValue[] {
  if (!value) {
    return ORDER_TYPES.map((type) => type.value);
  }

  if (value === "none") {
    return [];
  }

  const selected = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is OrderTypeValue =>
      ORDER_TYPES.some((type) => type.value === entry),
    );

  return [...new Set(selected)];
}

function typesQueryValue(types: OrderTypeValue[]): string | undefined {
  if (types.length === 0) {
    return "none";
  }

  if (types.length === ORDER_TYPES.length) {
    return undefined;
  }

  return types.join(",");
}

export default function OrdersScreen() {
  const router = useRouter();
  const statsQuery = useGetDashboardStats();
  const settingsQuery = useGetSettings();
  const kitchenOpen = settingsQuery.data?.serviceAvailable ?? true;
  const stats = statsQuery.data;

  const params = useLocalSearchParams<{
    tab?: string | string[];
    status?: string | string[];
    search?: string | string[];
    sort?: string | string[];
    date?: string | string[];
    types?: string | string[];
    page?: string | string[];
    sortAll?: string | string[];
    sortPending?: string | string[];
    sortPreparing?: string | string[];
    sortReady?: string | string[];
    sortCompleted?: string | string[];
    sortCancelled?: string | string[];
  }>();

  const tabParam = firstParam(params.tab) ?? firstParam(params.status);
  const statusFilter: StatusFilter = STATUS_FILTERS.includes(
    tabParam as StatusFilter,
  )
    ? (tabParam as StatusFilter)
    : "all";

  const search = firstParam(params.search) ?? "";
  const selectedTypes = parseTypes(firstParam(params.types));
  const pageParam = Number(firstParam(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const storedSorts: Record<StatusFilter, SortOption | undefined> = {
    all: parseSort(firstParam(params.sortAll)),
    pending: parseSort(firstParam(params.sortPending)),
    preparing: parseSort(firstParam(params.sortPreparing)),
    ready: parseSort(firstParam(params.sortReady)),
    completed: parseSort(firstParam(params.sortCompleted)),
    cancelled: parseSort(firstParam(params.sortCancelled)),
  };

  const sort =
    storedSorts[statusFilter] ??
    parseSort(firstParam(params.sort)) ??
    defaultSort(statusFilter);

  const dateParam = firstParam(params.date);
  const dateTouched = DATE_OPTIONS.some((option) => option.value === dateParam);
  const dateFilter: DateOption =
    statusFilter === "all" && dateTouched
      ? (dateParam as DateOption)
      : smartDateFilter(statusFilter);

  const { sortBy, sortOrder } = sortQuery(sort);

  function updateParams(next: {
    tab?: StatusFilter;
    search?: string;
    sort?: SortOption;
    date?: DateOption;
    types?: OrderTypeValue[];
    page?: number;
  }) {
    const nextTab = next.tab ?? statusFilter;
    const nextSorts = { ...storedSorts };
    nextSorts[statusFilter] = sort;
    nextSorts[nextTab] = next.sort ?? nextSorts[nextTab] ?? defaultSort(nextTab);
    const nextDate = next.date ?? dateFilter;
    const nextTypes = next.types ?? selectedTypes;
    const filtersChanged =
      next.tab !== undefined ||
      next.search !== undefined ||
      next.sort !== undefined ||
      next.date !== undefined ||
      next.types !== undefined;
    const nextPage = next.page ?? (filtersChanged ? 1 : page);

    router.setParams({
      tab: nextTab,
      status: nextTab,
      search: next.search ?? search,
      sort: nextSorts[nextTab],
      date: nextDate,
      types: typesQueryValue(nextTypes) ?? "",
      page: String(nextPage),
      sortAll: nextSorts.all ?? "",
      sortPending: nextSorts.pending ?? "",
      sortPreparing: nextSorts.preparing ?? "",
      sortReady: nextSorts.ready ?? "",
      sortCompleted: nextSorts.completed ?? "",
      sortCancelled: nextSorts.cancelled ?? "",
    });
  }

  const ordersQuery = useGetOrders({
    status:
      statusFilter === "all" ? undefined : (statusFilter as GetOrdersStatus),
    search: search.trim() || undefined,
    sortBy,
    sortOrder,
    dateFilter: dateFilter as GetOrdersDateFilter,
    orderTypes: typesQueryValue(selectedTypes),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const orders = ordersQuery.data?.items ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const showDayGroups = statusFilter === "all";
  const showOverdue = isOpenStatus(statusFilter);
  const groups = showDayGroups
    ? groupOrdersByDay(orders, sort === "oldest")
    : [];

  const tabCounts: Record<Exclude<StatusFilter, "all">, number | undefined> = {
    pending: stats?.pendingOrders,
    preparing: stats?.orderStatusBreakdown.preparing,
    ready: stats?.orderStatusBreakdown.ready,
    completed: stats?.completedToday,
    cancelled: stats?.orderStatusBreakdown.cancelled,
  };

  const rangeStart = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, total);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.page }}
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
          <Text
            style={{
              ...sans,
              fontSize: 11,
              letterSpacing: 1.2,
              color: palette.muted,
              fontFamily: fonts.sansSemiBold,
            }}
          >
            {todayLabel()}
          </Text>
          <Text style={{ ...serif, fontSize: 32, letterSpacing: -0.4, lineHeight: 40 }}>
            Orders
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        <SummaryCard
          label="Total Today"
          value={stats ? String(stats.totalOrders) : "—"}
          icon={<Ionicons name="receipt-outline" size={18} color={palette.red} />}
          iconBackground={palette.redSoft}
        />
        <SummaryCard
          label="Pending"
          value={stats ? String(stats.pendingOrders) : "—"}
          icon={<Ionicons name="time-outline" size={18} color={palette.gold} />}
          iconBackground={palette.goldSoft}
        />
        <SummaryCard
          label="Preparing"
          value={stats ? String(stats.orderStatusBreakdown.preparing) : "—"}
          icon={<Ionicons name="flame-outline" size={18} color={palette.teal} />}
          iconBackground={palette.tealSoft}
        />
        <SummaryCard
          label="Ready"
          value={stats ? String(stats.orderStatusBreakdown.ready) : "—"}
          icon={
            <Ionicons name="checkmark-circle-outline" size={18} color={palette.green} />
          }
          iconBackground={palette.greenSoft}
        />
        <SummaryCard
          label="Completed"
          value={stats ? String(stats.completedToday) : "—"}
          icon={<Ionicons name="checkmark-outline" size={18} color={palette.dim} />}
          iconBackground={palette.track}
        />
        <SummaryCard
          label="Cancelled"
          value={stats ? String(stats.orderStatusBreakdown.cancelled) : "—"}
          icon={<Ionicons name="close-outline" size={18} color={palette.red} />}
          iconBackground={palette.redSoft}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          maxWidth: 442,
          width: "100%",
          backgroundColor: palette.card,
          borderWidth: 1,
          borderColor: palette.controlBorder,
          borderRadius: 99,
          paddingLeft: 14,
          paddingRight: 5,
          paddingVertical: 4,
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
        }}
      >
        <TextInput
          value={search}
          onChangeText={(value) => updateParams({ search: value })}
          placeholder="Search by customer or order #…"
          placeholderTextColor="rgba(51, 51, 51, 0.5)"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            paddingVertical: 8,
            paddingRight: 10,
            ...sans,
            fontSize: 13,
          }}
        />
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: palette.red,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="search" size={15} color="#ffffff" />
        </View>
      </View>

      <View
        style={{
          backgroundColor: palette.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: palette.hairline,
          overflow: "visible",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 22,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: palette.hairline,
            zIndex: 50,
            elevation: 20,
            position: "relative",
          }}
        >
          <StatusTabs
            selected={statusFilter}
            counts={tabCounts}
            onSelect={(filter) => updateParams({ tab: filter })}
          />

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              zIndex: 60,
              elevation: 21,
            }}
          >
            {statusFilter === "all" ? (
              <FilterMenu
                prefix="Date:"
                options={DATE_OPTIONS}
                selected={dateFilter}
                onSelect={(value) => updateParams({ date: value })}
              />
            ) : null}
            <FilterMenu
              prefix="Sort:"
              options={SORT_OPTIONS}
              selected={sort}
              onSelect={(value) => updateParams({ sort: value })}
            />
            <TypeFilter
              selected={selectedTypes}
              onChange={(types) => updateParams({ types })}
            />
          </View>
        </View>

        <View style={{ zIndex: 0, elevation: 0 }}>

        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 22,
            paddingVertical: 10,
            backgroundColor: "#faf7f5",
            borderBottomWidth: 1,
            borderBottomColor: palette.hairline,
          }}
        >
          {[
            { label: "Order ID", flex: 1.1 },
            { label: "Customer", flex: 1.4 },
            { label: "Date", flex: 1.2 },
            { label: "Type", flex: 1.1 },
            { label: "Items", flex: 0.7 },
            { label: "Total", flex: 0.9 },
            { label: "Status", flex: 1.4 },
          ].map((column) => (
            <Text
              key={column.label}
              style={{
                flex: column.flex,
                ...sans,
                fontSize: 11,
                fontFamily: fonts.sansSemiBold,
                color: palette.muted,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              {column.label}
            </Text>
          ))}
        </View>

        {ordersQuery.isLoading ? <OrdersSkeleton /> : null}

        {!ordersQuery.isLoading && orders.length === 0 ? (
          <View style={{ padding: 28 }}>
            <Text style={{ ...sans, fontSize: 14, color: palette.dim }}>No orders</Text>
          </View>
        ) : null}

        {showDayGroups
          ? groups.map((group) => (
              <View key={group.key}>
                <View
                  style={{
                    backgroundColor: "#f9fafb",
                    paddingHorizontal: 22,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      ...sans,
                      fontSize: 12,
                      fontFamily: fonts.sansSemiBold,
                      color: palette.muted,
                    }}
                  >
                    {group.label}
                  </Text>
                </View>
                {group.orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    showOverdue={showOverdue}
                    onPress={() => router.push(`/orders/${order.id}`)}
                  />
                ))}
              </View>
            ))
          : orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                showOverdue={showOverdue}
                onPress={() => router.push(`/orders/${order.id}`)}
              />
            ))}

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 22,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: palette.hairline,
          }}
        >
          <Text style={{ ...sans, fontSize: 12, color: palette.dim }}>
            {total === 0
              ? "Showing 0 orders"
              : `Showing ${rangeStart}–${rangeEnd} of ${total} orders`}
          </Text>
          {total > PAGE_SIZE ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <PagerButton
                label="Prev"
                disabled={safePage <= 1}
                onPress={() => updateParams({ page: safePage - 1 })}
              />
              {Array.from({ length: pageCount }, (_, index) => index + 1)
                .filter((value) => {
                  if (pageCount <= 7) {
                    return true;
                  }

                  return (
                    value === 1 ||
                    value === pageCount ||
                    Math.abs(value - safePage) <= 1
                  );
                })
                .reduce<number[]>((pages, value) => {
                  const previous = pages[pages.length - 1];
                  if (previous && value - previous > 1) {
                    pages.push(-value);
                  }
                  pages.push(value);
                  return pages;
                }, [])
                .map((value) =>
                  value < 0 ? (
                    <Text key={`gap-${value}`} style={{ ...sans, color: palette.dim }}>
                      …
                    </Text>
                  ) : (
                    <PagerButton
                      key={value}
                      label={String(value)}
                      active={value === safePage}
                      onPress={() => updateParams({ page: value })}
                    />
                  ),
                )}
              <PagerButton
                label="Next"
                disabled={safePage >= pageCount}
                onPress={() => updateParams({ page: safePage + 1 })}
              />
            </View>
          ) : null}
        </View>
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  iconBackground,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconBackground: string;
}) {
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: 120,
        minWidth: 118,
        backgroundColor: palette.card,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 10,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            ...sans,
            color: palette.muted,
            fontSize: 13,
            fontFamily: fonts.sansSemiBold,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            flex: 1,
            paddingRight: 8,
          }}
        >
          {label}
        </Text>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: iconBackground,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </View>
      </View>
      <Text style={{ ...serif, fontSize: 28, letterSpacing: -0.5, lineHeight: 32 }}>
        {value}
      </Text>
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
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 1.5,
  shadowOffset: { width: 0, height: 1 },
};

const dropdownPanel = {
  position: "absolute" as const,
  top: 44,
  right: 0,
  minWidth: 168,
  backgroundColor: palette.card,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.controlBorder,
  shadowColor: "#000",
  shadowOpacity: 0.16,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  zIndex: 9999,
  elevation: 40,
};

function StatusTabs({
  selected,
  counts,
  onSelect,
}: {
  selected: StatusFilter;
  counts: Record<Exclude<StatusFilter, "all">, number | undefined>;
  onSelect: (filter: StatusFilter) => void;
}) {
  const layouts = useRef<Partial<Record<StatusFilter, { x: number; width: number }>>>(
    {},
  );
  const [pill, setPill] = useState({ x: 4, width: 48 });

  useEffect(() => {
    const layout = layouts.current[selected];
    if (layout) {
      setPill(layout);
    }
  }, [selected]);

  return (
    <View
      style={{
        backgroundColor: palette.tabTrack,
        borderRadius: 99,
        padding: 4,
        flexDirection: "row",
        alignItems: "center",
        position: "relative",
        minHeight: 45.5,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: pill.x,
          top: 4,
          width: pill.width,
          height: 37.5,
          borderRadius: 99,
          backgroundColor: palette.red,
          shadowColor: palette.red,
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          transitionProperty: "left, width",
          transitionDuration: "220ms",
          transitionTimingFunction: "ease-out",
        }}
      />
      {STATUS_FILTERS.map((filter) => {
        const isSelected = selected === filter;
        const count = filter === "all" ? undefined : counts[filter];

        return (
          <Pressable
            key={filter}
            onPress={() => onSelect(filter)}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              layouts.current[filter] = { x, width };
              if (filter === selected) {
                setPill({ x, width });
              }
            }}
            style={{
              paddingVertical: 9,
              paddingHorizontal: 16,
              borderRadius: 99,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              zIndex: 1,
            }}
          >
            <Text
              style={{
                ...sans,
                fontSize: 13,
                lineHeight: 20,
                fontFamily: isSelected ? fonts.sansSemiBold : fonts.sansMedium,
                color: isSelected ? "#ffffff" : palette.muted,
              }}
            >
              {statusLabel(filter)}
            </Text>
            {count !== undefined ? (
              <Text
                style={{
                  ...sans,
                  fontSize: 11,
                  lineHeight: 16,
                  fontFamily: fonts.sansBold,
                  color: isSelected ? "rgba(255,255,255,0.85)" : "rgba(160, 112, 96, 0.6)",
                }}
              >
                {count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

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
  const selectedLabel =
    options.find((option) => option.value === selected)?.label ?? selected;

  return (
    <View style={{ position: "relative", zIndex: open ? 80 : 1, elevation: open ? 30 : 1 }}>
      <Pressable onPress={() => setOpen((current) => !current)} style={dropdownTrigger}>
        <Text style={{ ...sans, fontSize: 13, color: palette.muted }}>{prefix}</Text>
        <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansMedium, color: palette.value }}>
          {selectedLabel}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={13}
          color={palette.red}
        />
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

function TypeFilter({
  selected,
  onChange,
}: {
  selected: OrderTypeValue[];
  onChange: (types: OrderTypeValue[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    selected.length === ORDER_TYPES.length
      ? "All"
      : selected.length === 0
        ? "None"
        : selected
            .map(
              (value) =>
                ORDER_TYPES.find((type) => type.value === value)?.label ?? value,
            )
            .join(", ");

  return (
    <View style={{ position: "relative", zIndex: open ? 80 : 1, elevation: open ? 30 : 1 }}>
      <Pressable onPress={() => setOpen((current) => !current)} style={dropdownTrigger}>
        <Text style={{ ...sans, fontSize: 13, color: palette.muted }}>Type:</Text>
        <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansMedium, color: palette.value }}>
          {label}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={13}
          color={palette.red}
        />
      </Pressable>
      {open ? (
        <View style={dropdownPanel}>
          {ORDER_TYPES.map((type) => {
            const checked = selected.includes(type.value);

            return (
              <Pressable
                key={type.value}
                onPress={() => {
                  if (checked) {
                    onChange(selected.filter((value) => value !== type.value));
                    return;
                  }

                  onChange([...selected, type.value]);
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: checked ? palette.red : "#d1d5db",
                    backgroundColor: checked ? palette.red : palette.card,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {checked ? (
                    <Ionicons name="checkmark" size={11} color="#ffffff" />
                  ) : null}
                </View>
                <Text style={{ ...sans, fontSize: 13 }}>{type.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function OrderRow({
  order,
  showOverdue,
  onPress,
}: {
  order: OrderWithDetails;
  showOverdue: boolean;
  onPress: () => void;
}) {
  const { date, time } = formatRowDate(order.createdAt);
  const overdueText =
    showOverdue && isOpenStatus(order.status)
      ? overdueLabel(order.createdAt)
      : null;
  const pill = STATUS_PILL[order.status] ?? STATUS_PILL.pending;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: palette.hairline,
        minHeight: 62,
      }}
    >
      <Text
        style={{
          flex: 1.1,
          ...sans,
          fontSize: 13,
          fontFamily: fonts.sansSemiBold,
        }}
      >
        {orderNumber(order.id)}
      </Text>
      <Text numberOfLines={1} style={{ flex: 1.4, ...sans, fontSize: 13 }}>
        {order.customer.name}
      </Text>
      <View style={{ flex: 1.2 }}>
        <Text style={{ ...sans, fontSize: 12, color: palette.body }}>{date}</Text>
        <Text style={{ ...sans, fontSize: 11, color: palette.muted }}>{time}</Text>
      </View>
      <View style={{ flex: 1.1, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={orderTypeIcon(order.orderType)} size={14} color={palette.dim} />
        <Text style={{ ...sans, fontSize: 12, color: palette.body }}>
          {orderTypeLabel(order.orderType)}
        </Text>
      </View>
      <Text style={{ flex: 0.7, ...sans, fontSize: 13 }}>{itemCount(order)}</Text>
      <Text
        style={{
          flex: 0.9,
          ...sans,
          fontSize: 13,
          fontFamily: fonts.sansSemiBold,
        }}
      >
        {formatMoney(order.total)}
      </Text>
      <View style={{ flex: 1.4, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: pill.background,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Ionicons name={pill.icon} size={12} color={pill.color} />
          <Text
            style={{
              ...sans,
              fontSize: 12,
              fontFamily: fonts.sansSemiBold,
              color: pill.color,
            }}
          >
            {statusLabel(order.status)}
          </Text>
        </View>
        {overdueText ? (
          <View
            style={{
              backgroundColor: "#ffedd5",
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                ...sans,
                fontSize: 11,
                fontFamily: fonts.sansSemiBold,
                color: "#9a3412",
              }}
            >
              {overdueText}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function PagerButton({
  label,
  onPress,
  disabled,
  active,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        minWidth: 32,
        height: 32,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? palette.red : palette.track,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text
        style={{
          ...sans,
          fontSize: 12,
          fontFamily: fonts.sansSemiBold,
          color: active ? "#ffffff" : palette.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function OrdersSkeleton() {
  return (
    <View>
      {[0, 1, 2, 3, 4].map((key) => (
        <View
          key={key}
          style={{
            height: 62,
            borderBottomWidth: 1,
            borderBottomColor: palette.hairline,
            paddingHorizontal: 22,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              height: 14,
              width: "70%",
              backgroundColor: palette.track,
              borderRadius: 4,
            }}
          />
        </View>
      ))}
    </View>
  );
}
