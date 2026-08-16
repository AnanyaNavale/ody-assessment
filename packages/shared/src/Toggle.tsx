import { Pressable, View } from "react-native";
import { colors } from "./tokens";

export function Toggle({
  value,
  onValueChange,
  disabled = false,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        padding: 2,
        justifyContent: "center",
        backgroundColor: value
          ? colors.primary.background
          : colors.skeleton,
        opacity: disabled ? 0.6 : 1,
        alignSelf: "flex-start",
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.background,
          alignSelf: value ? "flex-end" : "flex-start",
        }}
      />
    </Pressable>
  );
}
