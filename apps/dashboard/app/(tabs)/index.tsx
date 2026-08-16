import { useGetDashboardStats } from "@ody/api-client";
import { Card, colors, spacing, typography } from "@ody/shared";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

function formatMoney(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(amount)) {
    return `$${value}`;
  }

  return `$${amount.toFixed(2)}`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const statsQuery = useGetDashboardStats();
  const stats = statsQuery.data;

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
    >
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.title}>Today</Text>
        <Text style={typography.caption}>{todayLabel()}</Text>
      </View>

      {statsQuery.isLoading ? <DashboardSkeleton /> : null}

      {statsQuery.isError ? (
        <Card>
          <Text style={typography.body}>Unable to load dashboard stats</Text>
        </Card>
      ) : null}

      {stats ? (
        <>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.md,
            }}
          >
            <KpiCard
              label="Total orders"
              value={String(stats.totalOrders)}
              detail={`${stats.completedToday} completed today`}
            />
            <KpiCard
              label="Total revenue"
              value={formatMoney(stats.totalRevenue)}
              detail="From completed orders today"
            />
            <KpiCard
              label="Pending orders"
              value={String(stats.pendingOrders)}
              detail={
                stats.pendingOrders > 0
                  ? "Waiting to be prepared"
                  : "Queue is clear"
              }
              accent={stats.pendingOrders > 0 ? colors.pending : undefined}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/orders",
                  params: { tab: "pending" },
                })
              }
            />
            <KpiCard
              label="Average order"
              value={formatMoney(stats.averageOrderValue)}
              detail="Completed orders today"
            />
          </View>

          <Card style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={typography.subtitle}>Popular items</Text>
              <Text style={typography.caption}>Most ordered today</Text>
            </View>
            {stats.popularItems.length === 0 ? (
              <Text style={typography.body}>No items ordered yet today</Text>
            ) : (
              stats.popularItems.map((item, index) => (
                <View
                  key={item.menuItemId}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.md,
                    paddingVertical: spacing.sm,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: colors.surface,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={typography.caption}>{index + 1}</Text>
                  </View>
                  <Text style={[typography.body, { flex: 1 }]}>
                    {item.menuItemName}
                  </Text>
                  <Text style={typography.subtitle}>
                    {item.orderCount}{" "}
                    {item.orderCount === 1 ? "order" : "orders"}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function KpiCard({
  label,
  value,
  detail,
  accent,
  onPress,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: { background: string; text: string };
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text
        style={{
          ...typography.caption,
          color: accent?.text ?? colors.muted,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 32,
          fontWeight: "700",
          color: accent?.text ?? colors.text,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          ...typography.caption,
          color: accent?.text ?? colors.muted,
        }}
      >
        {detail}
      </Text>
    </>
  );

  const cardStyle = {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 200,
    gap: spacing.sm,
    backgroundColor: accent?.background ?? colors.background,
  };

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={{ flexGrow: 1, flexBasis: 220, minWidth: 200 }}>
        <Card style={cardStyle}>{content}</Card>
      </Pressable>
    );
  }

  return <Card style={cardStyle}>{content}</Card>;
}

function DashboardSkeleton() {
  return (
    <View style={{ gap: spacing.xl }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.md,
        }}
      >
        {[0, 1, 2, 3].map((key) => (
          <Card
            key={key}
            style={{ flexGrow: 1, flexBasis: 220, minWidth: 200, gap: spacing.sm }}
          >
            <View
              style={{
                height: 12,
                width: "40%",
                backgroundColor: colors.skeleton,
              }}
            />
            <View
              style={{
                height: 32,
                width: "55%",
                backgroundColor: colors.skeleton,
              }}
            />
            <View
              style={{
                height: 12,
                width: "70%",
                backgroundColor: colors.skeleton,
              }}
            />
          </Card>
        ))}
      </View>
      <Card style={{ gap: spacing.md }}>
        <View
          style={{ height: 16, width: "30%", backgroundColor: colors.skeleton }}
        />
        {[0, 1, 2].map((key) => (
          <View
            key={key}
            style={{
              height: 14,
              width: key === 1 ? "70%" : "55%",
              backgroundColor: colors.skeleton,
            }}
          />
        ))}
      </Card>
    </View>
  );
}
