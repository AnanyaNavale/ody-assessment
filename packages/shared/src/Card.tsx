import { View, type ViewProps } from "react-native";
import { colors, spacing } from "./tokens";

export function Card({ style, ...props }: ViewProps) {
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 8,
          padding: spacing.md,
        },
        style,
      ]}
    />
  );
}
