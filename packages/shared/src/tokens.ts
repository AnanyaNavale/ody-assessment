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

/** Semantic dashboard colors — the values screens previously copied locally. */
export const palette = {
  page: colorScales.secondary[100],
  card: "#ffffff",
  ink: colorScales.secondary[900],
  muted: colorScales.secondary[600],
  body: "#444444",
  dim: "#777777",
  legend: "#999999",
  hour: "#b09080",
  axis: "#c0a898",
  value: "#555555",
  white: "#ffffff",
  red: colorScales.primary[500],
  redSoft: "rgba(215, 36, 0, 0.09)",
  redHalo: "rgba(215, 36, 0, 0.14)",
  redHover: "rgba(215, 36, 0, 0.45)",
  teal: "#7bbfc7",
  tealSoft: "rgba(123, 191, 199, 0.09)",
  gold: "#c47a00",
  goldSoft: "rgba(196, 122, 0, 0.1)",
  green: colorScales.success[600],
  greenSoft: "rgba(22, 163, 74, 0.09)",
  kitchen: colorScales.success[500],
  down: colorScales.error[500],
  pendingBar: colorScales.warning[500],
  track: "#f5ede8",
  bar: "#ffd6ca",
  line: colorScales.neutral[200],
  hairline: "#f0e8e4",
  itemLine: "#faf0eb",
  inputBg: "#fffaf8",
  tabTrack: "#fff5f2",
  tabActiveBg: colorScales.primary[50],
  avatarBg: colorScales.primary[50],
  controlBorder: "rgba(215, 36, 0, 0.15)",
  cardBorder: "rgba(215, 36, 0, 0.06)",
  sidebarBorder: "rgba(215, 36, 0, 0.1)",
  footerBorder: "rgba(215, 36, 0, 0.1)",
  tabInactive: "rgba(215, 36, 0, 0.55)",
  dashed: "rgba(215, 36, 0, 0.22)",
  placeholder: "rgba(51, 51, 51, 0.5)",
  inactive: colorScales.neutral[400],
  cancelled: colorScales.neutral[200],
} as const;

export const statusColors = {
  pending: {
    background: palette.goldSoft,
    text: palette.gold,
  },
  preparing: {
    background: "rgba(245, 158, 11, 0.15)",
    text: colorScales.warning[500],
  },
  ready: {
    background: "rgba(123, 191, 199, 0.18)",
    text: palette.teal,
  },
  completed: {
    background: "rgba(34, 197, 94, 0.08)",
    text: palette.green,
  },
  cancelled: {
    background: palette.line,
    text: colorScales.neutral[500],
  },
} as const;

export const colors = {
  page: palette.page,
  card: palette.card,
  background: palette.card,
  surface: palette.inputBg,
  border: palette.hairline,
  text: palette.ink,
  muted: palette.muted,
  skeleton: palette.line,
  ink: palette.ink,
  red: palette.red,
  primary: { background: palette.red, text: palette.white },
  danger: { background: palette.down, text: palette.white },
  selected: { background: palette.ink, text: palette.white },
  warning: {
    background: colorScales.warning[100],
    text: colorScales.warning[800],
  },
  pending: statusColors.pending,
  preparing: statusColors.preparing,
  ready: statusColors.ready,
  completed: statusColors.completed,
  cancelled: statusColors.cancelled,
  dine_in: { background: "#ede9fe", text: "#5b21b6" },
  pickup: { background: "#ccfbf1", text: "#115e59" },
  delivery: { background: "#e0e7ff", text: "#3730a3" },
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
    shadowColor: palette.ink,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: palette.ink,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: palette.ink,
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
