import {
  useGetOrders,
  type GetOrdersDateFilter,
  type GetOrdersSortBy,
  type GetOrdersSortOrder,
  type GetOrdersStatus,
  type OrderWithDetails,
} from "@ody/api-client";
import { Badge, Card, colors, spacing, typography } from "@ody/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

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
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
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

function firstParam(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function orderNumber(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function orderTypeLabel(orderType: string): string {
  if (orderType === "dine_in") {
    return "Dine in";
  }

  if (orderType === "pickup") {
    return "Pickup";
  }

  if (orderType === "delivery") {
    return "Delivery";
  }

  return orderType;
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

  return new Date(dayStart).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
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
  if (tab === "completed" || tab === "cancelled") {
    return "today";
  }

  return "all";
}

const OPEN_STATUSES = ["pending", "preparing", "ready"] as const;

function isOpenStatus(status: string): boolean {
  return OPEN_STATUSES.some((value) => value === status);
}

function isOverdue(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000;
}

function matchesDateFilter(timestamp: string, filter: DateOption): boolean {
  if (filter === "all") {
    return true;
  }

  const date = new Date(timestamp);

  if (filter === "today") {
    return startOfLocalDay(date) === startOfLocalDay(new Date());
  }

  const ageMs = Date.now() - date.getTime();

  if (filter === "last_7_days") {
    return ageMs <= 7 * 24 * 60 * 60 * 1000;
  }

  return ageMs <= 30 * 24 * 60 * 60 * 1000;
}

function overdueLabel(createdAt: string): string | null {
  if (!isOverdue(createdAt)) {
    return null;
  }

  const placedDay = startOfLocalDay(new Date(createdAt));
  const yesterday = startOfLocalDay(new Date()) - 24 * 60 * 60 * 1000;

  if (placedDay === yesterday) {
    return "⚠️ Placed yesterday";
  }

  return "⚠️ Overdue";
}

export default function OrdersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tab?: string | string[];
    status?: string | string[];
    search?: string | string[];
    sort?: string | string[];
    date?: string | string[];
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
  const allTabDate: DateOption = dateTouched ? (dateParam as DateOption) : "all";
  const dateFilter =
    statusFilter === "all" ? allTabDate : smartDateFilter(statusFilter);

  const { sortBy, sortOrder } = sortQuery(sort);

  function updateParams(next: {
    tab?: StatusFilter;
    search?: string;
    sort?: SortOption;
    date?: DateOption;
  }) {
    const nextTab = next.tab ?? statusFilter;
    const nextSorts = { ...storedSorts };
    nextSorts[statusFilter] = sort;
    nextSorts[nextTab] = next.sort ?? nextSorts[nextTab] ?? defaultSort(nextTab);

    router.setParams({
      tab: nextTab,
      status: nextTab,
      search: next.search ?? search,
      sort: nextSorts[nextTab],
      date: next.date ?? (dateTouched ? allTabDate : ""),
      sortAll: nextSorts.all ?? "",
      sortPending: nextSorts.pending ?? "",
      sortPreparing: nextSorts.preparing ?? "",
      sortReady: nextSorts.ready ?? "",
      sortCompleted: nextSorts.completed ?? "",
      sortCancelled: nextSorts.cancelled ?? "",
    });
  }

  const queryDateFilter: GetOrdersDateFilter =
    statusFilter === "cancelled"
      ? "all"
      : (dateFilter as GetOrdersDateFilter);

  const ordersQuery = useGetOrders({
    status:
      statusFilter === "all" ? undefined : (statusFilter as GetOrdersStatus),
    search: search.trim() || undefined,
    sortBy,
    sortOrder,
    dateFilter: queryDateFilter,
    limit: 100,
  });

  const orders = (ordersQuery.data ?? []).filter((order) => {
    if (statusFilter !== "cancelled") {
      return true;
    }

    return matchesDateFilter(order.updatedAt, dateFilter);
  });
  const showDayGroups = statusFilter === "all";
  const showOverdue = isOpenStatus(statusFilter);
  const groups = showDayGroups
    ? groupOrdersByDay(orders, sort === "oldest")
    : [];

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
      <Text style={typography.title}>Orders</Text>

      <TextInput
        value={search}
        onChangeText={(value) => updateParams({ search: value })}
        placeholder="Search by customer or order #"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 8,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          ...typography.body,
        }}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {STATUS_FILTERS.map((filter) => {
          const selected = statusFilter === filter;

          return (
            <Pressable
              key={filter}
              onPress={() => updateParams({ tab: filter })}
              style={{
                backgroundColor: selected
                  ? colors.selected.background
                  : colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  ...typography.body,
                  color: selected ? colors.selected.text : colors.text,
                }}
              >
                {statusLabel(filter)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FilterRow
        label="Sort"
        options={SORT_OPTIONS}
        selected={sort}
        onSelect={(value) => updateParams({ sort: value })}
      />

      {statusFilter === "all" ? (
        <FilterRow
          label="Date"
          options={DATE_OPTIONS}
          selected={allTabDate}
          onSelect={(value) => updateParams({ date: value })}
        />
      ) : null}

      {ordersQuery.isLoading ? <OrdersSkeleton /> : null}

      {!ordersQuery.isLoading && orders.length === 0 ? (
        <Card>
          <Text style={typography.body}>No orders</Text>
        </Card>
      ) : null}

      {showDayGroups
        ? groups.map((group) => (
            <View key={group.key} style={{ gap: spacing.sm }}>
              <Text style={typography.subtitle}>{group.label}</Text>
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
    </ScrollView>
  );
}

function FilterRow<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    options.find((option) => option.value === selected)?.label ?? selected;

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.caption}>{label}</Text>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 8,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={typography.body}>{selectedLabel}</Text>
        <Text style={typography.caption}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open ? (
        <View
          style={{
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            backgroundColor: colors.background,
            overflow: "hidden",
          }}
        >
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
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  backgroundColor: isSelected
                    ? colors.selected.background
                    : colors.background,
                }}
              >
                <Text
                  style={{
                    ...typography.body,
                    color: isSelected ? colors.selected.text : colors.text,
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

function OrderRow({
  order,
  showOverdue,
  onPress,
}: {
  order: OrderWithDetails;
  showOverdue: boolean;
  onPress: () => void;
}) {
  const overdueText =
    showOverdue && isOpenStatus(order.status)
      ? overdueLabel(order.createdAt)
      : null;

  return (
    <Pressable onPress={onPress}>
      <Card
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={typography.subtitle}>#{orderNumber(order.id)}</Text>
          <Text style={typography.body}>{order.customer.name}</Text>
          <Text style={typography.caption}>{formatDate(order.createdAt)}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <Badge
              label={orderTypeLabel(order.orderType)}
              tone={order.orderType}
            />
            {overdueText ? <Badge label={overdueText} tone="warning" /> : null}
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: spacing.sm }}>
          <Text style={typography.subtitle}>${order.total}</Text>
          <Badge label={statusLabel(order.status)} tone={order.status} />
        </View>
      </Card>
    </Pressable>
  );
}

function OrdersSkeleton() {
  return (
    <View style={{ gap: spacing.md }}>
      {[0, 1, 2, 3].map((key) => (
        <Card key={key} style={{ gap: spacing.sm }}>
          <View
            style={{
              height: 16,
              width: "40%",
              backgroundColor: colors.skeleton,
            }}
          />
          <View
            style={{
              height: 14,
              width: "55%",
              backgroundColor: colors.skeleton,
            }}
          />
          <View
            style={{
              height: 12,
              width: "30%",
              backgroundColor: colors.skeleton,
            }}
          />
        </Card>
      ))}
    </View>
  );
}
