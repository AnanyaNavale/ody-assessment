export const colors = {
  background: "#ffffff",
  surface: "#f9fafb",
  border: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
  skeleton: "#e5e7eb",
  pending: { background: "#fef3c7", text: "#92400e" },
  preparing: { background: "#dbeafe", text: "#1e40af" },
  ready: { background: "#d1fae5", text: "#065f46" },
  completed: { background: "#e5e7eb", text: "#374151" },
  cancelled: { background: "#fee2e2", text: "#991b1b" },
  selected: { background: "#111827", text: "#ffffff" },
  primary: { background: "#2563eb", text: "#ffffff" },
  danger: { background: "#dc2626", text: "#ffffff" },
  warning: { background: "#ffedd5", text: "#9a3412" },
  dine_in: { background: "#ede9fe", text: "#5b21b6" },
  pickup: { background: "#ccfbf1", text: "#115e59" },
  delivery: { background: "#e0e7ff", text: "#3730a3" },
};

export const colorScales = {
  primary: {
    50: "#fff0ed",
    100: "#ffd8d0",
    200: "#ffb3a3",
    300: "#f27a5c",
    400: "#e94a28",
    500: "#d72400",
    600: "#b31e00",
    700: "#8c1700",
    800: "#661100",
    900: "#3d0a00",
  },
  secondary: {
    50: "#fff8f4",
    100: "#ffe9e0",
    200: "#ffd3c4",
    300: "#f5b8a4",
    400: "#e09a84",
    500: "#c47a62",
    600: "#a07060",
    700: "#7a5348",
    800: "#533830",
    900: "#1a0800",
  },
  success: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
  },
  error: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#dc2626",
    600: "#b91c1c",
    700: "#991b1b",
    800: "#7f1d1d",
    900: "#450a0a",
  },
  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },
  neutral: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const borders = {
  hairline: 1,
  default: 1.5,
  thick: 2,
};

export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  sm: {
    shadowColor: "#1a0800",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: "#1a0800",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: "#1a0800",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};

export const elevation = {
  0: 0,
  1: 1,
  2: 3,
  3: 6,
  4: 12,
};

export const fonts = {
  sans: "DMSans-Regular",
  sansMedium: "DMSans-Medium",
  sansSemiBold: "DMSans-SemiBold",
  sansBold: "DMSans-Bold",
  serif: "DMSerifDisplay-Regular",
} as const;

export const typography = {
  display: {
    fontFamily: fonts.serif,
    fontSize: 36,
    color: colors.text,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 24,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.text,
  },
  heading: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.text,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.muted,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  serifTitle: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.text,
  },
};
