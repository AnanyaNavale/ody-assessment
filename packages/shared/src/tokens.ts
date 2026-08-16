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

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const typography = {
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
  },
  body: {
    fontSize: 14,
    color: colors.text,
  },
  caption: {
    fontSize: 12,
    color: colors.muted,
  },
};
