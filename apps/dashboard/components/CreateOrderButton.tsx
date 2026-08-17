import { fonts } from "@ody/shared";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";
import { canCreateOrder } from "../lib/order-status";

export function CreateOrderButton({
  kitchenOpen,
  onPress,
}: {
  kitchenOpen: boolean;
  onPress: () => void;
}) {
  const enabled = canCreateOrder(kitchenOpen);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create an Order"
      accessibilityState={{ disabled: !enabled }}
      onPress={() => {
        if (enabled) {
          onPress();
        }
      }}
      disabled={!enabled}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: enabled ? "#d72400" : "#e5e7eb",
        borderRadius: 99,
        paddingVertical: 10,
        paddingHorizontal: 16,
        opacity: enabled ? 1 : 0.85,
      }}
    >
      <Ionicons name="add" size={18} color={enabled ? "#ffffff" : "#9ca3af"} />
      <Text
        style={{
          fontFamily: fonts.sansSemiBold,
          color: enabled ? "#ffffff" : "#9ca3af",
          fontSize: 13,
        }}
      >
        Create an Order
      </Text>
    </Pressable>
  );
}
