import { Text, View } from "react-native";
import { colors, spacing } from "./tokens";

type BadgeTone =
  | "pending"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "warning"
  | "dine_in"
  | "pickup"
  | "delivery";

export function Badge({
  label,
  tone,
}: {
  label: string;
  tone: BadgeTone;
}) {
  const palette = colors[tone];

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: palette.background,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 4,
      }}
    >
      <Text style={{ color: palette.text, fontSize: 12, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}
