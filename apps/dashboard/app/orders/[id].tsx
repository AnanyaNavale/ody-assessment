import {
  getGetOrderQueryKey,
  getGetOrdersQueryKey,
  useGetOrder,
  useUpdateOrderStatus,
  type UpdateOrderStatusStatus,
} from "@ody/api-client";
import { Badge, Button, Card, spacing, typography } from "@ody/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";

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

function nextStatusAction(status: string): {
  label: string;
  status: UpdateOrderStatusStatus;
} | null {
  if (status === "pending") {
    return { label: "Start Preparing", status: "preparing" };
  }

  if (status === "preparing") {
    return { label: "Mark Ready", status: "ready" };
  }

  if (status === "ready") {
    return { label: "Complete Order", status: "completed" };
  }

  return null;
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const orderQuery = useGetOrder(id ?? "", {
    query: { enabled: Boolean(id) },
  });
  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: async () => {
        if (!id) {
          return;
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(id) }),
          queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() }),
        ]);
      },
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "Failed to update status";
        console.log(message);
        alert(message);
      },
    },
  });

  const order = orderQuery.data;
  const action = order ? nextStatusAction(order.status) : null;
  const canCancel =
    order !== undefined &&
    order.status !== "completed" &&
    order.status !== "cancelled";

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

          router.push("/(tabs)/orders");
        }}
      />

      {orderQuery.isLoading ? (
        <Card>
          <Text style={typography.body}>Loading order...</Text>
        </Card>
      ) : null}

      {orderQuery.isError || (!orderQuery.isLoading && !order) ? (
        <Card>
          <Text style={typography.body}>Order not found</Text>
        </Card>
      ) : null}

      {order ? (
        <>
          <Card style={{ gap: spacing.sm }}>
            <Text style={typography.title}>#{orderNumber(order.id)}</Text>
            <Badge label={statusLabel(order.status)} tone={order.status} />
            <Badge
              label={orderTypeLabel(order.orderType)}
              tone={order.orderType}
            />
            <Text style={typography.caption}>
              Placed at {formatDate(order.createdAt)}
            </Text>
            {order.status === "completed" ? (
              <Text style={typography.caption}>
                Completed at{" "}
                {formatDate(order.completedAt ?? order.updatedAt)}
              </Text>
            ) : null}
            <Text style={typography.subtitle}>${order.total}</Text>
          </Card>

          <Card style={{ gap: spacing.xs }}>
            <Text style={typography.subtitle}>Customer</Text>
            <Text style={typography.body}>{order.customer.name}</Text>
            <Text style={typography.body}>{order.customer.email}</Text>
            <Text style={typography.body}>
              {order.customer.phone ?? "No phone"}
            </Text>
          </Card>

          <Card style={{ gap: spacing.md }}>
            <Text style={typography.subtitle}>Items</Text>
            {order.orderItems.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: spacing.md,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={typography.body}>{item.menuItem.name}</Text>
                  <Text style={typography.caption}>
                    qty {item.quantity} × ${item.priceAtTime}
                  </Text>
                </View>
                <Text style={typography.body}>${item.subtotal}</Text>
              </View>
            ))}
          </Card>

          <Card style={{ gap: spacing.xs }}>
            <Text style={typography.subtitle}>Summary</Text>
            <Text style={typography.body}>Subtotal: ${order.subtotal}</Text>
            <Text style={typography.body}>Tax: ${order.tax}</Text>
            <Text style={typography.subtitle}>Total: ${order.total}</Text>
          </Card>

          {order.notes ? (
            <Card>
              <Text style={typography.subtitle}>Notes</Text>
              <Text style={typography.body}>{order.notes}</Text>
            </Card>
          ) : null}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {action ? (
              <Button
                label={
                  updateStatus.isPending ? "Updating..." : action.label
                }
                disabled={updateStatus.isPending}
                onPress={() =>
                  updateStatus.mutate({
                    id: order.id,
                    data: { status: action.status },
                  })
                }
              />
            ) : null}
            {canCancel ? (
              <Button
                label={updateStatus.isPending ? "Updating..." : "Cancel Order"}
                variant="danger"
                disabled={updateStatus.isPending}
                onPress={() =>
                  updateStatus.mutate({
                    id: order.id,
                    data: { status: "cancelled" },
                  })
                }
              />
            ) : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
