import {
  useGetCustomers,
  type CustomerListItem,
} from "@ody/api-client";
import { Card, colors, spacing, typography } from "@ody/shared";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

const SORT_OPTIONS = [
  { value: "orders", label: "Most orders" },
  { value: "spend", label: "Highest spend" },
  { value: "recent", label: "Recent activity" },
  { value: "name", label: "Name A-Z" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

function lastOrderDate(customer: CustomerListItem): string | null {
  return customer.recentOrders[0]?.createdAt ?? null;
}

function matchesSearch(customer: CustomerListItem, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  const haystack = [
    customer.name,
    customer.email,
    customer.phone ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

function sortCustomers(
  customers: CustomerListItem[],
  sort: SortOption,
): CustomerListItem[] {
  return [...customers].sort((a, b) => {
    if (sort === "orders") {
      return b.totalOrders - a.totalOrders;
    }

    if (sort === "spend") {
      return Number(b.totalSpent) - Number(a.totalSpent);
    }

    if (sort === "recent") {
      const aTime = lastOrderDate(a);
      const bTime = lastOrderDate(b);

      if (!aTime && !bTime) {
        return a.name.localeCompare(b.name);
      }

      if (!aTime) {
        return 1;
      }

      if (!bTime) {
        return -1;
      }

      return new Date(bTime).getTime() - new Date(aTime).getTime();
    }

    return a.name.localeCompare(b.name);
  });
}

function formatMoney(value: string): string {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return `$${value}`;
  }

  return `$${amount.toFixed(2)}`;
}

function formatLastOrder(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CrmScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("orders");
  const customersQuery = useGetCustomers({ limit: 100 });

  const customers = useMemo(() => {
    const filtered = (customersQuery.data ?? []).filter((customer) =>
      matchesSearch(customer, search),
    );

    return sortCustomers(filtered, sort);
  }, [customersQuery.data, search, sort]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
      <Text style={typography.title}>CRM</Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, email, or phone"
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

      <SortDropdown selected={sort} onSelect={setSort} />

      {customersQuery.isLoading ? <CustomersSkeleton /> : null}

      {!customersQuery.isLoading && customers.length === 0 ? (
        <Card>
          <Text style={typography.body}>
            {search.trim() ? "No matching customers" : "No customers"}
          </Text>
        </Card>
      ) : null}

      {customers.map((customer) => (
        <CustomerRow
          key={customer.id}
          customer={customer}
          onPress={() => router.push(`/crm/${customer.id}`)}
        />
      ))}
    </ScrollView>
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
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.caption}>Sort</Text>
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

function CustomerRow({
  customer,
  onPress,
}: {
  customer: CustomerListItem;
  onPress: () => void;
}) {
  const lastOrder = lastOrderDate(customer);

  return (
    <Pressable onPress={onPress}>
      <Card style={{ gap: spacing.sm }}>
        <Text style={typography.subtitle}>{customer.name}</Text>
        <Text style={typography.body}>{customer.email}</Text>
        <Text style={typography.caption}>{customer.phone ?? "No phone"}</Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing.md,
            marginTop: spacing.xs,
          }}
        >
          <Text style={typography.caption}>
            {customer.totalOrders}{" "}
            {customer.totalOrders === 1 ? "order" : "orders"}
          </Text>
          <Text style={typography.caption}>
            {formatMoney(customer.totalSpent)} spent
          </Text>
          <Text style={typography.caption}>
            {lastOrder
              ? `Last order ${formatLastOrder(lastOrder)}`
              : "No orders yet"}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

function CustomersSkeleton() {
  return (
    <View style={{ gap: spacing.md }}>
      {[0, 1, 2, 3].map((key) => (
        <Card key={key} style={{ gap: spacing.sm }}>
          <View
            style={{
              height: 16,
              width: "45%",
              backgroundColor: colors.skeleton,
            }}
          />
          <View
            style={{
              height: 14,
              width: "60%",
              backgroundColor: colors.skeleton,
            }}
          />
          <View
            style={{
              height: 12,
              width: "35%",
              backgroundColor: colors.skeleton,
            }}
          />
        </Card>
      ))}
    </View>
  );
}
