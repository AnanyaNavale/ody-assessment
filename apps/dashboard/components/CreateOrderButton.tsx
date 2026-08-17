import { fonts, palette } from "@ody/shared";
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
        backgroundColor: enabled ? palette.red : palette.line,
        borderRadius: 99,
        paddingVertical: 10,
        paddingHorizontal: 16,
        opacity: enabled ? 1 : 0.85,
      }}
    >
      <Ionicons name="add" size={18} color={enabled ? palette.white : palette.inactive} />
      <Text
        style={{
          fontFamily: fonts.sansSemiBold,
          color: enabled ? palette.white : palette.inactive,
          fontSize: 13,
        }}
      >
        Create an Order
      </Text>
    </Pressable>
  );
}
