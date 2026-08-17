import { Pressable, Text, type PressableProps } from "react-native";
import { colors, fonts, spacing, typography } from "./tokens";

type ButtonVariant = "primary" | "danger" | "secondary";

const variantStyles: Record<
  ButtonVariant,
  { backgroundColor: string; color: string }
> = {
  primary: {
    backgroundColor: colors.primary.background,
    color: colors.primary.text,
  },
  danger: {
    backgroundColor: colors.danger.background,
    color: colors.danger.text,
  },
  secondary: { backgroundColor: colors.surface, color: colors.text },
};

export function Button({
  label,
  variant = "primary",
  disabled,
  style,
  ...props
}: PressableProps & {
  label: string;
  variant?: ButtonVariant;
}) {
  const palette = variantStyles[variant];

  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={[
        {
          backgroundColor: palette.backgroundColor,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: 6,
          opacity: disabled ? 0.6 : 1,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <Text
        style={{
          ...typography.body,
          color: palette.color,
          fontFamily: fonts.sansSemiBold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
