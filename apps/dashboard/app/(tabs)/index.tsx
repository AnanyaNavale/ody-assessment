import {
  useGetDashboardStats,
  useGetSettings,
  type DashboardStats,
  type PopularItem,
} from "@ody/api-client";
import { fonts, palette } from "@ody/shared";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, type ReactNode } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

const serif: TextStyle = {
  fontFamily: fonts.serif,
  color: palette.ink,
};

const sans: TextStyle = {
  fontFamily: fonts.sans,
  color: palette.ink,
};

function formatMoney(value: string | number, compact = false): string {
  const amount = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(amount)) {
    return `$${value}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact && amount % 1 === 0 ? 0 : 2,
    minimumFractionDigits: compact && amount % 1 === 0 ? 0 : 2,
  }).format(amount);
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

function greeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning, Ananya";
  }

  if (hour < 17) {
    return "Good afternoon, Ananya";
  }

  return "Good evening, Ananya";
}

function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  const rendered = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${sign}${rendered}%`;
}

export default function HomeScreen() {
  const router = useRouter();
  const statsQuery = useGetDashboardStats();
  const settingsQuery = useGetSettings();
  const stats = statsQuery.data;
  const kitchenOpen = settingsQuery.data?.serviceAvailable ?? true;

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
          gap: 12,
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
          <Text
            style={{
              ...serif,
              fontSize: 28,
              letterSpacing: -0.56,
              marginTop: 4,
            }}
          >
            {greeting()}
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

      {statsQuery.isLoading ? <DashboardSkeleton /> : null}

      {statsQuery.isError ? (
        <Panel>
          <Text style={{ ...sans, fontSize: 14 }}>
            Unable to load dashboard stats
          </Text>
        </Panel>
      ) : null}

      {stats ? (
        <>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 16,
              alignItems: "stretch",
            }}
          >
            <KpiCard
              label="Today's Orders"
              value={String(stats.totalOrders)}
              trend={percentTrend(stats.totalOrdersChangePercent)}
              iconBackground={palette.redSoft}
              icon={
                <Ionicons
                  name="receipt-outline"
                  size={18}
                  color={palette.red}
                />
              }
            />
            <KpiCard
              label="Total Revenue"
              value={formatMoney(stats.totalRevenue, true)}
              trend={percentTrend(stats.revenueChangePercent)}
              iconBackground={palette.tealSoft}
              icon={
                <Ionicons
                  name="wallet-outline"
                  size={18}
                  color={palette.teal}
                />
              }
            />
            <KpiCard
              label="Customers Served"
              value={String(stats.customersServed)}
              trend={percentTrend(stats.customersServedChangePercent)}
              iconBackground={palette.redSoft}
              icon={
                <Ionicons name="people-outline" size={18} color={palette.red} />
              }
            />
            <KpiCard
              label="Pending Orders"
              value={String(stats.pendingOrders)}
              trend={null} // Remove trend - pending orders are current state, not historical
              iconBackground={palette.goldSoft}
              icon={
                <Ionicons name="time-outline" size={18} color={palette.gold} />
              }
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/orders",
                  params: { tab: "pending" },
                })
              }
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "stretch",
              gap: 20,
            }}
          >
            <View style={{ flexGrow: 1, flexBasis: 360, minWidth: 280 }}>
              <KeyMetricsCard averageOrderValue={stats.averageOrderValue} />
            </View>
            <View style={{ flexGrow: 1, flexBasis: 360, minWidth: 280 }}>
              <StatusBreakdownCard breakdown={stats.orderStatusBreakdown} />
            </View>
          </View>

          <PopularItemsRow items={stats.popularItems} />

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "stretch",
              gap: 20,
            }}
          >
            <View style={{ flexGrow: 1, flexBasis: 360, minWidth: 280 }}>
              <HourlyOrdersCard hours={stats.hourlyOrders} />
            </View>
            <View style={{ flexGrow: 1, flexBasis: 360, minWidth: 280 }}>
              <OrderTypeCard distribution={stats.orderTypeDistribution} />
            </View>
          </View>

          <HomeFooter />
        </>
      ) : null}
    </ScrollView>
  );
}

function percentTrend(value: number | null): { text: string; up: boolean } {
  if (value === null) {
    return {
      text: "New vs yesterday",
      up: true,
    };
  }

  return {
    text: `${formatPercent(value)} vs yesterday`,
    up: value >= 0,
  };
}

function Panel({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.card,
          borderRadius: 16,
          paddingHorizontal: 22,
          paddingVertical: 18,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={{ ...serif, fontSize: 17, lineHeight: 25.5 }}>{children}</Text>
  );
}

function KpiCard({
  label,
  value,
  trend,
  icon,
  iconBackground,
  onPress,
}: {
  label: string;
  value: string;
  trend: { text: string; up: boolean } | null;
  icon: ReactNode;
  iconBackground: string;
  onPress?: () => void;
}) {
  const cardStyle = {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 200,
    backgroundColor: palette.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 10,
    alignSelf: "stretch",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  } as const;

  const content = (
    <View style={cardStyle}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          numberOfLines={1}
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
      <View>
        <Text style={{ ...serif, fontSize: 28, letterSpacing: -0.5, lineHeight: 32 }}>
          {value}
        </Text>
        {trend ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              marginTop: 10,
            }}
          >
            <Ionicons
              name={trend.up ? "trending-up" : "trending-down"}
              size={12}
              color={trend.up ? palette.green : palette.down}
            />
            <Text
              style={{
                ...sans,
                fontSize: 12,
                lineHeight: 16,
                fontFamily: fonts.sansSemiBold,
                color: trend.up ? palette.green : palette.down,
              }}
            >
              {trend.text}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minWidth: 200,
          alignSelf: "stretch",
        }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

function KeyMetricsCard({ averageOrderValue }: { averageOrderValue: string }) {
  return (
    <View
      style={{
        backgroundColor: palette.card,
        borderRadius: 16,
        overflow: "hidden",
        flex: 1,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      <View
        style={{
          paddingHorizontal: 22,
          paddingTop: 18,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: palette.hairline,
        }}
      >
        <SectionTitle>Key Metrics</SectionTitle>
      </View>
      <View
        style={{
          paddingHorizontal: 22,
          paddingVertical: 13,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: palette.hairline,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: "rgba(123, 191, 199, 0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="trending-up" size={14} color={palette.teal} />
          </View>
          <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansMedium, color: palette.body }}>
            Avg. Order Value
          </Text>
        </View>
        <Text style={{ ...serif, fontSize: 18, flex: 1, textAlign: "center" }}>
          {formatMoney(averageOrderValue)}
        </Text>
        <Text
          style={{
            ...sans,
            fontSize: 12,
            color: palette.muted,
            flex: 1,
            textAlign: "right",
          }}
        >
          Per cover
        </Text>
      </View>
    </View>
  );
}

function OrderTypeCard({
  distribution,
}: {
  distribution: DashboardStats["orderTypeDistribution"];
}) {
  const types = [
    {
      key: "dineIn",
      label: "Dine-In",
      color: palette.red,
      soft: palette.redSoft,
      icon: (
        <MaterialCommunityIcons name="silverware-fork-knife" size={15} color={palette.red} />
      ),
      share: distribution.dineIn,
    },
    {
      key: "pickup",
      label: "Pickup",
      color: palette.teal,
      soft: palette.tealSoft,
      icon: <Ionicons name="bag-handle-outline" size={15} color={palette.teal} />,
      share: distribution.pickup,
    },
    {
      key: "delivery",
      label: "Delivery",
      color: palette.gold,
      soft: palette.goldSoft,
      icon: <Ionicons name="car-outline" size={15} color={palette.gold} />,
      share: distribution.delivery,
    },
  ] as const;

  const total = types.reduce((sum, type) => sum + type.share.count, 0);

  return (
    <Panel style={{ flex: 1 }}>
      <SectionTitle>Order Type Distribution</SectionTitle>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        {types.map((type) => (
          <View key={type.key} style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: type.soft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {type.icon}
              </View>
              <Text style={{ ...sans, fontSize: 12, fontFamily: fonts.sansMedium, color: palette.dim }}>
                {type.label}
              </Text>
            </View>
            <Text style={{ ...serif, fontSize: 22, lineHeight: 33 }}>{type.share.count}</Text>
            <Text style={{ ...sans, fontSize: 11, fontFamily: fonts.sansSemiBold, color: type.color }}>
              {Math.round(type.share.percentage)}% of orders
            </Text>
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          height: 10,
          borderRadius: 99,
          overflow: "hidden",
          marginTop: 14,
          backgroundColor: palette.track,
        }}
      >
        {types.map((type) =>
          type.share.count > 0 ? (
            <View
              key={type.key}
              style={{
                flex: total === 0 ? 1 : type.share.count,
                backgroundColor: type.color,
                height: 10,
              }}
            />
          ) : null,
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
        {types.map((type) => (
          <View key={type.key} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: type.color,
              }}
            />
            <Text style={{ ...sans, fontSize: 11, color: palette.legend }}>{type.label}</Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}

function HourlyOrdersCard({
  hours,
}: {
  hours: DashboardStats["hourlyOrders"];
}) {
  const visible = hours.filter((row) => row.hour >= 10 && row.hour <= 21);
  const dataMax = Math.max(...visible.map((row) => row.count), 1);
  const yMax = Math.max(45, Math.ceil(dataMax / 15) * 15);
  const ticks = [yMax, Math.round((yMax * 2) / 3), Math.round(yMax / 3), 0];
  const chartHeight = 110;

  return (
    <Panel style={{ paddingVertical: 20, flex: 1 }}>
      <View style={{ marginBottom: 4 }}>
        <SectionTitle>Hourly Orders</SectionTitle>
        <Text style={{ ...sans, fontSize: 12, color: palette.muted, marginTop: 2 }}>
          Today · covers per hour
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, paddingTop: 14 }}>
        <View style={{ height: chartHeight, justifyContent: "space-between" }}>
          {ticks.map((tick) => (
            <Text
              key={tick}
              style={{
                ...sans,
                fontSize: 9,
                color: palette.axis,
                textAlign: "right",
                lineHeight: 9,
              }}
            >
              {tick}
            </Text>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ height: chartHeight, position: "relative" }}>
            {ticks.map((tick, index) => (
              <View
                key={tick}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: index === ticks.length - 1 ? chartHeight - 1 : (index / (ticks.length - 1)) * chartHeight,
                  borderTopWidth: 1,
                  borderStyle: index === ticks.length - 1 ? "solid" : "dashed",
                  borderColor:
                    index === ticks.length - 1
                      ? "rgba(215, 36, 0, 0.15)"
                      : "rgba(215, 36, 0, 0.1)",
                }}
              />
            ))}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                gap: 4,
                height: chartHeight,
              }}
            >
              {visible.map((row) => {
                const height = Math.max(3, (row.count / yMax) * chartHeight);
                const isPeak = row.count === dataMax && row.count > 0;
                return (
                  <View
                    key={row.hour}
                    style={{ flex: 1, height: chartHeight, justifyContent: "flex-end" }}
                  >
                    <View
                      style={{
                        height,
                        borderTopLeftRadius: 3,
                        borderTopRightRadius: 3,
                        backgroundColor: isPeak ? palette.red : palette.bar,
                      }}
                    />
                  </View>
                );
              })}
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 4, marginTop: 5 }}>
            {visible.map((row) => (
              <Text
                key={row.hour}
                style={{
                  ...sans,
                  flex: 1,
                  fontSize: 9,
                  color: palette.hour,
                  textAlign: "center",
                }}
              >
                {row.hour}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </Panel>
  );
}

function StatusBreakdownCard({
  breakdown,
}: {
  breakdown: DashboardStats["orderStatusBreakdown"];
}) {
  const rows = [
    { label: "Completed", count: breakdown.completed, color: "#22C55E" },
    { label: "Pending", count: breakdown.pending, color: "#D72400" },
    { label: "Preparing", count: breakdown.preparing, color: "#F59E0B" },
    { label: "Ready", count: breakdown.ready, color: "#7BBFC7" },
    { label: "Cancelled", count: breakdown.cancelled, color: "#E5E7EB" },
  ];
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <Panel style={{ paddingVertical: 20, flex: 1 }}>
      <SectionTitle>Order Status Breakdown</SectionTitle>
      <View style={{ gap: 10, marginTop: 14 }}>
        {rows.map((row) => (
          <View key={row.label} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ ...sans, width: 90, fontSize: 13, color: "#555" }}>{row.label}</Text>
            <View
              style={{
                flex: 1,
                height: 7,
                borderRadius: 99,
                backgroundColor: palette.track,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${(row.count / max) * 100}%`,
                  height: 7,
                  borderRadius: 99,
                  backgroundColor: row.color,
                }}
              />
            </View>
            <Text
              style={{
                ...sans,
                width: 32,
                fontSize: 13,
                fontFamily: fonts.sansSemiBold,
                textAlign: "right",
              }}
            >
              {row.count}
            </Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}

function PopularItemsRow({ items }: { items: PopularItem[] }) {
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);

  return (
    <View>
      <SectionTitle>Popular Items</SectionTitle>
      {items.length === 0 ? (
        <Panel style={{ marginTop: 12 }}>
          <Text style={{ ...sans, fontSize: 13, color: palette.muted }}>
            No items ordered yet today
          </Text>
        </Panel>
      ) : (
        <View style={{ marginTop: 12, position: "relative" }}>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              offsetRef.current = event.nativeEvent.contentOffset.x;
            }}
            scrollEventThrottle={16}
            contentContainerStyle={{ gap: 14, paddingRight: 56, paddingBottom: 4 }}
          >
            {items.map((item, index) => (
              <PopularItemCard key={item.menuItemId} item={item} rank={index + 1} />
            ))}
          </ScrollView>
          <Pressable
            onPress={() =>
              scrollRef.current?.scrollTo({
                x: offsetRef.current + 204,
                animated: true,
              })
            }
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              marginTop: -22,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: palette.red,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Ionicons name="chevron-forward" size={24} color="#ffffff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function PopularItemCard({ item, rank }: { item: PopularItem; rank: number }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(tabs)/menu",
          params: { itemId: item.menuItemId, t: String(Date.now()) },
        })
      }
      style={{
        width: 190,
        backgroundColor: palette.card,
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      <View style={{ height: 148, backgroundColor: palette.track, position: "relative" }}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: 190, height: 148 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 190,
              height: 148,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="restaurant-outline" size={28} color={palette.muted} />
          </View>
        )}
        <View
          style={{
            position: "absolute",
            left: 7,
            top: 7,
            backgroundColor: palette.red,
            borderRadius: 5,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text style={{ ...sans, color: "#fff", fontSize: 10, fontFamily: fonts.sansBold }}>
            #{rank}
          </Text>
        </View>
        <View
          style={{
            position: "absolute",
            right: 7,
            top: 7,
            backgroundColor: "rgba(255,255,255,0.92)",
            borderRadius: 5,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text style={{ ...sans, color: "#555", fontSize: 9, fontFamily: fonts.sansSemiBold }}>
            {item.categoryName}
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 11, paddingTop: 9, paddingBottom: 11 }}>
        <Text
          numberOfLines={1}
          style={{ ...sans, fontSize: 12, fontFamily: fonts.sansSemiBold, color: palette.ink }}
        >
          {item.menuItemName}
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 5,
          }}
        >
          <Text style={{ ...sans, fontSize: 10, color: palette.muted }}>
            {item.orderCount} {item.orderCount === 1 ? "order" : "orders"}
          </Text>
          <Text style={{ ...sans, fontSize: 11, fontFamily: fonts.sansBold, color: palette.teal }}>
            {formatMoney(item.revenue, true)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function HomeFooter() {
  const icons = [
    "logo-instagram",
    "logo-facebook",
    "logo-twitter",
    "logo-linkedin",
  ] as const;

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: palette.footerBorder,
        paddingTop: 10,
        paddingBottom: 12,
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
      }}
    >
      {icons.map((name) => (
        <View
          key={name}
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.footerBorder,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={name} size={13} color="rgba(215, 36, 0, 0.45)" />
        </View>
      ))}
    </View>
  );
}

function DashboardSkeleton() {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        {[0, 1, 2, 3].map((key) => (
          <View
            key={key}
            style={{
              flexGrow: 1,
              flexBasis: 200,
              minWidth: 180,
              height: 144,
              borderRadius: 16,
              backgroundColor: palette.track,
            }}
          />
        ))}
      </View>
      <View style={{ height: 220, borderRadius: 16, backgroundColor: palette.track }} />
    </View>
  );
}
