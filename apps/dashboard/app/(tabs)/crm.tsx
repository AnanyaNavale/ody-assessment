import {
  useGetCustomers,
  useGetSettings,
  type CustomerListItem,
} from "@ody/api-client";
import { fonts } from "@ody/shared";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
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

const SORT_OPTIONS = [
  { value: "last_az", label: "Last Name A–Z" },
  { value: "last_za", label: "Last Name Z–A" },
  { value: "orders", label: "Most orders" },
  { value: "spend", label: "Highest spend" },
  { value: "recent", label: "Recent activity" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

const COLUMNS = [
  { label: "Name", flex: 1.6 },
  { label: "Email", flex: 1.8 },
  { label: "Phone #", flex: 1.2 },
  { label: "Orders", flex: 0.8 },
  { label: "Total Spent", flex: 0.9 },
  { label: "First Order", flex: 1 },
  { label: "Last Order", flex: 1 },
] as const;

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

function lastName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[parts.length - 1] ?? name).toLowerCase();
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

function formatRowDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function orderDates(customer: CustomerListItem): { first: string | null; last: string | null } {
  if (customer.recentOrders.length === 0) {
    return { first: null, last: null };
  }

  const sorted = [...customer.recentOrders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return {
    first: sorted[0]?.createdAt ?? null,
    last: sorted[sorted.length - 1]?.createdAt ?? null,
  };
}

function matchesSearch(customer: CustomerListItem, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  return [customer.name, customer.email, customer.phone ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function sortCustomers(customers: CustomerListItem[], sort: SortOption): CustomerListItem[] {
  return [...customers].sort((a, b) => {
    if (sort === "orders") {
      return b.totalOrders - a.totalOrders;
    }

    if (sort === "spend") {
      return Number(b.totalSpent) - Number(a.totalSpent);
    }

    if (sort === "recent") {
      const aLast = orderDates(a).last;
      const bLast = orderDates(b).last;

      if (!aLast && !bLast) {
        return lastName(a.name).localeCompare(lastName(b.name));
      }

      if (!aLast) {
        return 1;
      }

      if (!bLast) {
        return -1;
      }

      return new Date(bLast).getTime() - new Date(aLast).getTime();
    }

    const compared = lastName(a.name).localeCompare(lastName(b.name));
    return sort === "last_za" ? -compared : compared;
  });
}

function isSameMonth(value: string, now = new Date()): boolean {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export default function CrmScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("last_az");
  const customersQuery = useGetCustomers({ limit: 100 });
  const settingsQuery = useGetSettings();
  const kitchenOpen = settingsQuery.data?.serviceAvailable ?? true;
  const allCustomers = customersQuery.data ?? [];

  const customers = useMemo(() => {
    const filtered = allCustomers.filter((customer) => matchesSearch(customer, search));
    return sortCustomers(filtered, sort);
  }, [allCustomers, search, sort]);

  const totalCustomers = allCustomers.length;
  const totalOrders = allCustomers.reduce((sum, customer) => sum + customer.totalOrders, 0);
  const totalRevenue = allCustomers.reduce(
    (sum, customer) => sum + Number(customer.totalSpent),
    0,
  );
  const avgSpend = totalCustomers === 0 ? 0 : totalRevenue / totalCustomers;
  const newThisMonth = allCustomers.filter((customer) => isSameMonth(customer.createdAt)).length;
  const repeatRate =
    totalCustomers === 0
      ? 0
      : Math.round(
          (allCustomers.filter((customer) => customer.totalOrders > 1).length / totalCustomers) *
            100,
        );

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
              color: palette.muted,
              fontSize: 13,
              fontFamily: fonts.sansMedium,
              letterSpacing: 1.04,
            }}
          >
            {todayLabel()}
          </Text>
          <Text style={{ ...serif, fontSize: 32, letterSpacing: -0.4, lineHeight: 40, marginTop: 4 }}>
            Customers
          </Text>
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

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        <SummaryCard
          label="Total Customers"
          value={customersQuery.isLoading ? "—" : String(totalCustomers)}
          icon={<Ionicons name="people-outline" size={18} color={palette.red} />}
          iconBackground={palette.redSoft}
        />
        <SummaryCard
          label="Total Orders"
          value={customersQuery.isLoading ? "—" : String(totalOrders)}
          icon={<Ionicons name="receipt-outline" size={18} color={palette.red} />}
          iconBackground={palette.redSoft}
        />
        <SummaryCard
          label="Total Revenue"
          value={customersQuery.isLoading ? "—" : formatMoney(totalRevenue)}
          icon={<Ionicons name="wallet-outline" size={18} color={palette.teal} />}
          iconBackground={palette.tealSoft}
        />
        <SummaryCard
          label="Avg. Spend"
          value={customersQuery.isLoading ? "—" : formatMoney(avgSpend)}
          icon={<Ionicons name="trending-up" size={18} color={palette.gold} />}
          iconBackground={palette.goldSoft}
        />
        <SummaryCard
          label="New This Month"
          value={customersQuery.isLoading ? "—" : String(newThisMonth)}
          icon={<Ionicons name="person-add-outline" size={18} color={palette.red} />}
          iconBackground={palette.redSoft}
        />
        <SummaryCard
          label="Repeat Rate"
          value={customersQuery.isLoading ? "—" : `${repeatRate}%`}
          icon={<Ionicons name="refresh-outline" size={18} color={palette.teal} />}
          iconBackground={palette.tealSoft}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          zIndex: 40,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexGrow: 1,
            flexShrink: 1,
            maxWidth: 442,
            minWidth: 240,
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
            onChangeText={setSearch}
            placeholder="Search by name, email, or phone…"
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
        <FilterMenu
          prefix="Sort:"
          options={SORT_OPTIONS}
          selected={sort}
          onSelect={setSort}
        />
      </View>

      <View
        style={{
          backgroundColor: palette.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: palette.hairline,
          overflow: "hidden",
        }}
      >
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
          {COLUMNS.map((column) => (
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

        {customersQuery.isLoading ? <CustomersSkeleton /> : null}

        {!customersQuery.isLoading && customers.length === 0 ? (
          <View style={{ padding: 28 }}>
            <Text style={{ ...sans, fontSize: 14, color: palette.dim }}>
              {search.trim() ? "No matching customers" : "No customers"}
            </Text>
          </View>
        ) : null}

        {customers.map((customer) => (
          <CustomerRow
            key={customer.id}
            customer={customer}
            onPress={() => router.push(`/crm/${customer.id}`)}
          />
        ))}
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
      <Text style={{ ...serif, fontSize: 28, letterSpacing: -0.5, lineHeight: 32 }}>{value}</Text>
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
  left: 0,
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

function CustomerRow({
  customer,
  onPress,
}: {
  customer: CustomerListItem;
  onPress: () => void;
}) {
  const { first, last } = orderDates(customer);

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 22,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: palette.hairline,
        minHeight: 59,
      }}
    >
      <View style={{ flex: 1.6, flexDirection: "row", alignItems: "center", gap: 10, paddingRight: 8 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(215, 36, 0, 0.09)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ ...sans, fontSize: 11, fontFamily: fonts.sansSemiBold, color: palette.red }}>
            {initials(customer.name)}
          </Text>
        </View>
        <Text numberOfLines={1} style={{ ...sans, fontSize: 13, fontFamily: fonts.sansMedium, flex: 1 }}>
          {customer.name}
        </Text>
      </View>
      <Text numberOfLines={1} style={{ flex: 1.8, ...sans, fontSize: 12, color: palette.body }}>
        {customer.email}
      </Text>
      <Text numberOfLines={1} style={{ flex: 1.2, ...sans, fontSize: 12, color: palette.body }}>
        {customer.phone ?? "—"}
      </Text>
      <View style={{ flex: 0.8, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansMedium }}>{customer.totalOrders}</Text>
        <Ionicons name="receipt-outline" size={12} color={palette.muted} />
      </View>
      <Text style={{ flex: 0.9, ...sans, fontSize: 13, fontFamily: fonts.sansSemiBold }}>
        {formatMoney(customer.totalSpent)}
      </Text>
      <Text style={{ flex: 1, ...sans, fontSize: 12, color: palette.body }}>{formatRowDate(first)}</Text>
      <Text style={{ flex: 1, ...sans, fontSize: 12, color: palette.body }}>{formatRowDate(last)}</Text>
    </Pressable>
  );
}

function CustomersSkeleton() {
  return (
    <View>
      {[0, 1, 2, 3, 4, 5].map((key) => (
        <View
          key={key}
          style={{
            height: 59,
            borderBottomWidth: 1,
            borderBottomColor: palette.hairline,
            backgroundColor: key % 2 === 0 ? palette.card : "#faf7f5",
          }}
        />
      ))}
    </View>
  );
}
