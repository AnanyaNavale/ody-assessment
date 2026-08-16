import { useGetCustomer, type CustomerOrderSummary } from "@ody/api-client";
import { Badge, Button, Card, colors, spacing, typography } from "@ody/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest value" },
  { value: "lowest", label: "Lowest value" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

function firstParam(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function orderNumber(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function formatMoney(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(amount)) {
    return `$${value}`;
  }

  return `$${amount.toFixed(2)}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function relativeTime(value: string): string {
  const days = Math.round(
    (startOfLocalDay(new Date()) - startOfLocalDay(new Date(value))) /
      (24 * 60 * 60 * 1000),
  );

  if (days <= 0) {
    return "today";
  }

  if (days === 1) {
    return "yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  if (days < 30) {
    const weeks = Math.max(1, Math.round(days / 7));
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }

  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  const years = Math.max(1, Math.round(days / 365));
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

function formatOrderDateWithRelative(value: string): string {
  return `${formatDate(value)} (${relativeTime(value)})`;
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

function sortOrders(
  orders: CustomerOrderSummary[],
  sort: SortOption,
): CustomerOrderSummary[] {
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

export default function CustomerDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string | string[];
    sort?: string | string[];
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const sortParam = firstParam(params.sort);
  const sort: SortOption = SORT_OPTIONS.some((option) => option.value === sortParam)
    ? (sortParam as SortOption)
    : "newest";

  const customerQuery = useGetCustomer(id ?? "");
  const customer = customerQuery.data;

  const chronological = [...(customer?.orders ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const firstOrder = chronological[0];
  const lastOrder = chronological[chronological.length - 1];
  const orders = sortOrders(customer?.orders ?? [], sort);

  const averageOrderValue =
    customer && customer.totalOrders > 0
      ? Number(customer.totalSpent) / customer.totalOrders
      : 0;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Button
        label="Back"
        variant="secondary"
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }

          router.push("/(tabs)/crm");
        }}
      />

      {customerQuery.isLoading ? (
        <Card>
          <Text style={typography.body}>Loading customer...</Text>
        </Card>
      ) : null}

      {customerQuery.isError || (!customerQuery.isLoading && !customer) ? (
        <Card>
          <Text style={typography.body}>Customer not found</Text>
        </Card>
      ) : null}

      {customer ? (
        <>
          <Card style={{ gap: spacing.xs }}>
            <Text style={typography.title}>{customer.name}</Text>
            <Text style={typography.body}>{customer.email}</Text>
            <Text style={typography.caption}>
              {customer.phone ?? "No phone"}
            </Text>
          </Card>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.md,
            }}
          >
            <StatCard
              label="Total orders"
              value={String(customer.totalOrders)}
            />
            <StatCard
              label="Total spent"
              value={formatMoney(customer.totalSpent)}
            />
            <StatCard
              label="Average order"
              value={formatMoney(averageOrderValue)}
            />
            <StatCard
              label="First order"
              value={firstOrder ? formatDate(firstOrder.createdAt) : "—"}
            />
            <StatCard
              label="Last order"
              value={
                lastOrder
                  ? formatOrderDateWithRelative(lastOrder.createdAt)
                  : "—"
              }
            />
          </View>

          <Card style={{ gap: spacing.md }}>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: spacing.md,
              }}
            >
              <Text style={[typography.subtitle, { flex: 1, minWidth: 120 }]}>
                Order history
              </Text>
              <View style={{ width: 180, maxWidth: "100%" }}>
                <SortDropdown
                  selected={sort}
                  onSelect={(value) => router.setParams({ sort: value })}
                />
              </View>
            </View>
            {orders.length === 0 ? (
              <Text style={typography.body}>No orders yet</Text>
            ) : (
              orders.map((order) => (
                <OrderHistoryRow
                  key={order.id}
                  order={order}
                  onPress={() => router.push(`/orders/${order.id}`)}
                />
              ))
            )}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flexGrow: 1, minWidth: 140, gap: spacing.xs }}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={typography.subtitle}>{value}</Text>
    </Card>
  );
}

function SortDropdown({
  selected,
  onSelect,
}: {
  selected: SortOption;
  onSelect: (value: SortOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    SORT_OPTIONS.find((option) => option.value === selected)?.label ?? selected;

  return (
    <View style={{ gap: spacing.xs }}>
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
          gap: spacing.sm,
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
          {SORT_OPTIONS.map((option) => {
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

function OrderHistoryRow({
  order,
  onPress,
}: {
  order: CustomerOrderSummary;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={typography.subtitle}>#{orderNumber(order.id)}</Text>
          <Text style={typography.caption}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: spacing.sm }}>
          <Text style={typography.subtitle}>{formatMoney(order.total)}</Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              gap: spacing.sm,
            }}
          >
            <Badge
              label={orderTypeLabel(order.orderType)}
              tone={order.orderType}
            />
            <Badge label={statusLabel(order.status)} tone={order.status} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
