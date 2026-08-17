import {
  borders,
  colorScales,
  colors,
  elevation,
  fonts,
  radius,
  shadows,
  spacing,
  typography,
} from "@ody/shared";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextStyle,
} from "react-native";
import {
  SegmentedToggleBar,
  segmentedTextTransition,
} from "../components/SegmentedToggleBar";

const page = "#ffe9e0";
const ink = "#1a0800";
const red = "#d72400";

const sans: TextStyle = { fontFamily: fonts.sans, color: ink };
const serif: TextStyle = { fontFamily: fonts.serif, color: ink };

const SCALE_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

const SAMPLE_IMAGES = {
  chicken:
    "https://images.unsplash.com/photo-1504670813815-f43e2383e08d?q=80&w=900&auto=format&fit=crop",
  fries:
    "https://images.unsplash.com/photo-1682117650826-881357860ec9?q=80&w=900&auto=format&fit=crop",
  burger:
    "https://images.unsplash.com/photo-1703219338500-90f646e60c1b?q=80&w=900&auto=format&fit=crop",
  salad:
    "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?q=80&w=900&auto=format&fit=crop",
} as const;

const STATUS_PILLS: Array<{
  label: string;
  background: string;
  color: string;
  icon: ComponentProps<typeof Ionicons>["name"];
}> = [
  {
    label: "Pending",
    background: "rgba(215, 36, 0, 0.12)",
    color: "#D72400",
    icon: "time-outline",
  },
  {
    label: "Preparing",
    background: "rgba(245, 158, 11, 0.15)",
    color: "#F59E0B",
    icon: "flame-outline",
  },
  {
    label: "Ready",
    background: "rgba(123, 191, 199, 0.18)",
    color: "#7BBFC7",
    icon: "checkmark-circle-outline",
  },
  {
    label: "Completed",
    background: "rgba(34, 197, 94, 0.15)",
    color: "#22C55E",
    icon: "checkmark-outline",
  },
  {
    label: "Cancelled",
    background: "#E5E7EB",
    color: "#6b7280",
    icon: "close-outline",
  },
];

export default function DesignSystemScreen() {
  const router = useRouter();
  const [input, setInput] = useState("Maya Chen");
  const [focused, setFocused] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [orderType, setOrderType] = useState("Dine in");
  const [modalOpen, setModalOpen] = useState(false);
  const [toggleOn, setToggleOn] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [menuTab, setMenuTab] = useState<"starters" | "mains" | "sides" | "desserts">("mains");
  const [orderTab, setOrderTab] = useState<"all" | "pending" | "preparing" | "ready">("pending");
  const [historyView, setHistoryView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  }

  return (
    <View style={{ flex: 1, backgroundColor: page }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 32,
          paddingTop: 28,
          paddingBottom: 48,
          gap: 20,
          maxWidth: 1100,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }
              router.push("/(tabs)/settings");
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#ffffff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={18} color={ink} />
          </Pressable>
          <Text style={{ ...serif, fontSize: 28, letterSpacing: -0.56, lineHeight: 42 }}>
            Design system
          </Text>
        </View>

        <Text style={{ ...sans, fontSize: 14, color: "#444444", maxWidth: 720 }}>
          Token and component gallery for the dashboard. These are the same
          colors, type, and surfaces used across Home, Orders, Menu, Customers,
          and Settings.
        </Text>

        <Section title="Color tokens" subtitle="Primary, secondary, success, error, warning, and neutral scales">
          {(Object.keys(colorScales) as Array<keyof typeof colorScales>).map((name) => (
            <View key={name} style={{ gap: 8, marginBottom: 12 }}>
              <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, fontSize: 13, textTransform: "capitalize" }}>
                {name}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {SCALE_KEYS.map((step) => (
                  <View key={step} style={{ width: 72, gap: 4 }}>
                    <View
                      style={{
                        height: 44,
                        backgroundColor: colorScales[name][step],
                      }}
                    />
                    <Text style={{ ...sans, fontSize: 10, color: "#777777" }}>
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </Section>

        <Section title="Typography" subtitle="DM Serif Display for titles, DM Sans for UI">
          <Text style={{ ...serif, fontSize: 36 }}>Display / page title</Text>
          <Text style={{ ...serif, fontSize: 22 }}>Serif heading</Text>
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 24, color: ink }}>Sans heading</Text>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 16, color: ink }}>Subtitle / section</Text>
          <Text style={{ ...sans, fontSize: 14 }}>Body copy for tables, forms, and descriptions.</Text>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: "#a07060" }}>
            LABEL / META
          </Text>
          <Text style={{ ...typography.caption }}>Caption and helper text</Text>
        </Section>

        <Section title="Spacing scale" subtitle="xs through 3xl">
          <View style={{ gap: 10 }}>
            {(Object.entries(spacing) as Array<[string, number]>).map(([name, value]) => (
              <View key={name} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ ...sans, width: 48, fontSize: 12 }}>{name}</Text>
                <View
                  style={{
                    height: 12,
                    width: value * 4,
                    backgroundColor: red,
                    borderRadius: 2,
                    opacity: 0.75,
                  }}
                />
                <Text style={{ ...sans, fontSize: 12, color: "#777777" }}>{value}px</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Radius, border, shadow, elevation">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            {(Object.entries(radius) as Array<[string, number]>).map(([name, value]) => (
              <View
                key={name}
                style={{
                  width: 88,
                  height: 64,
                  backgroundColor: "#fff0ed",
                  borderWidth: borders.default,
                  borderColor: "rgba(215, 36, 0, 0.15)",
                  borderRadius: value === 999 ? 32 : value,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ ...sans, fontSize: 11 }}>{name}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 16 }}>
            {(Object.keys(shadows) as Array<keyof typeof shadows>).map((name) => (
              <View
                key={name}
                style={{
                  width: 120,
                  height: 72,
                  backgroundColor: "#ffffff",
                  borderRadius: radius.lg,
                  alignItems: "center",
                  justifyContent: "center",
                  ...shadows[name],
                  elevation: elevation[name === "none" ? 0 : name === "sm" ? 1 : name === "md" ? 2 : 3],
                }}
              >
                <Text style={{ ...sans, fontSize: 12 }}>{name} / e{name === "none" ? 0 : name === "sm" ? 1 : name === "md" ? 2 : 3}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Surfaces / cards" subtitle="Plain dashboard surface plus image cards from Home, Menu, and Customers">
          <View
            style={{
              width: 220,
              backgroundColor: "#ffffff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(215, 36, 0, 0.06)",
              padding: 16,
              ...shadows.sm,
            }}
          >
            <Text style={{ ...serif, fontSize: 18 }}>Dashboard card</Text>
            <Text style={{ ...sans, fontSize: 13, color: "#a07060", marginTop: 6 }}>
              White card on peach page, used on live screens.
            </Text>
          </View>

          <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, fontSize: 13, marginTop: 4 }}>
            Popular item (Home)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            <PopularItemExample
              rank={1}
              name="Herb Roasted Chicken"
              category="Mains"
              orders={42}
              revenue="$1,240"
              imageUrl={SAMPLE_IMAGES.chicken}
            />
            <PopularItemExample
              rank={2}
              name="Truffle Parmesan Fries"
              category="Sides"
              orders={31}
              revenue="$465"
              imageUrl={SAMPLE_IMAGES.fries}
            />
          </View>

          <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, fontSize: 13, marginTop: 4 }}>
            Menu item
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            <MenuItemExample
              name="Classic Cheeseburger"
              description="Beef patty, cheddar, lettuce, tomato, pickle, brioche bun."
              price="$16.00"
              stock="18 left"
              available
              imageUrl={SAMPLE_IMAGES.burger}
            />
            <MenuItemExample
              name="Caesar Salad"
              description="Romaine, parmesan, garlic croutons, lemon dressing."
              price="$12.00"
              stock="Unavailable"
              available={false}
              imageUrl={SAMPLE_IMAGES.salad}
            />
          </View>

          <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, fontSize: 13, marginTop: 4 }}>
            Customer order (grid)
          </Text>
          <CustomerOrderCardExample
            images={[SAMPLE_IMAGES.chicken, SAMPLE_IMAGES.fries, SAMPLE_IMAGES.salad]}
          />

          <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, fontSize: 13, marginTop: 4 }}>
            Customer order (list)
          </Text>
          <CustomerOrderRowExample
            images={[SAMPLE_IMAGES.chicken, SAMPLE_IMAGES.fries]}
          />
        </Section>

        <Section title="Buttons" subtitle="Primary, secondary, disabled, loading">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <Pressable
              style={{
                backgroundColor: red,
                borderRadius: 99,
                paddingHorizontal: 18,
                paddingVertical: 12,
              }}
            >
              <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, color: "#ffffff" }}>Primary</Text>
            </Pressable>
            <Pressable
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 99,
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: "rgba(215, 36, 0, 0.15)",
              }}
            >
              <Text style={{ ...sans, fontFamily: fonts.sansSemiBold }}>Secondary</Text>
            </Pressable>
            <Pressable
              disabled
              style={{
                backgroundColor: "#e5e7eb",
                borderRadius: 99,
                paddingHorizontal: 18,
                paddingVertical: 12,
              }}
            >
              <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, color: "#9ca3af" }}>Disabled</Text>
            </Pressable>
            <View
              style={{
                backgroundColor: red,
                borderRadius: 99,
                paddingHorizontal: 18,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                opacity: 0.85,
              }}
            >
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, color: "#ffffff" }}>Loading</Text>
            </View>
          </View>
        </Section>

        <Section title="Inputs and form controls" subtitle="Default, focus, error, disabled">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            <Field label="Default">
              <TextInput
                value={input}
                onChangeText={setInput}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={fieldStyle(focused ? "focus" : "default")}
              />
            </Field>
            <Field label="Error">
              <TextInput value="" placeholder="Required" placeholderTextColor="rgba(51,51,51,0.5)" style={fieldStyle("error")} />
              <Text style={{ ...sans, fontSize: 12, color: "#dc2626", marginTop: 4 }}>Email is required</Text>
            </Field>
            <Field label="Disabled">
              <TextInput value="Read only" editable={false} style={fieldStyle("disabled")} />
            </Field>
            <Field label="Toggle">
              <RedToggle value={toggleOn} onValueChange={setToggleOn} />
            </Field>
          </View>
        </Section>

        <Section title="Search" subtitle="Pill search field used on Orders, Menu, and Customers">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              maxWidth: 442,
              minWidth: 240,
              width: "100%",
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "rgba(215, 36, 0, 0.15)",
              borderRadius: 99,
              paddingLeft: 14,
              paddingRight: 5,
              paddingVertical: 4,
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
            }}
          >
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by customer or order #…"
              placeholderTextColor="rgba(51, 51, 51, 0.5)"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingRight: 10,
                ...sans,
                fontSize: 13,
              }}
            />
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: red,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="search" size={15} color="#ffffff" />
            </View>
          </View>
        </Section>

        <Section title="Selects / dropdowns">
          <Pressable
            onPress={() => setSelectOpen((open) => !open)}
            style={[fieldStyle("default"), { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: 240 }]}
          >
            <Text style={{ ...sans, fontSize: 14 }}>{orderType}</Text>
            <Ionicons name={selectOpen ? "chevron-up" : "chevron-down"} size={16} color="#a07060" />
          </Pressable>
          {selectOpen ? (
            <View
              style={{
                width: 240,
                backgroundColor: "#ffffff",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(215, 36, 0, 0.15)",
                overflow: "hidden",
                ...shadows.md,
              }}
            >
              {["Dine in", "Pickup", "Delivery"].map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    setOrderType(option);
                    setSelectOpen(false);
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: option === orderType ? "#fff0ed" : "#ffffff" }}
                >
                  <Text style={{ ...sans, fontSize: 14 }}>{option}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Section>

        <Section title="Modals / dialogs">
          <Pressable
            onPress={() => setModalOpen(true)}
            style={{
              alignSelf: "flex-start",
              backgroundColor: red,
              borderRadius: 99,
              paddingHorizontal: 18,
              paddingVertical: 12,
            }}
          >
            <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, color: "#ffffff" }}>Open dialog</Text>
          </Pressable>
          <Modal visible={modalOpen} transparent animationType="fade">
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(26, 8, 0, 0.35)",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}
            >
              <View
                style={{
                  width: 420,
                  maxWidth: "100%",
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  padding: 24,
                  gap: 12,
                  ...shadows.lg,
                }}
              >
                <Text style={{ ...serif, fontSize: 22 }}>Confirm cancel</Text>
                <Text style={{ ...sans, fontSize: 14, color: "#444444" }}>
                  This matches the Create Order / confirm patterns used in the dashboard.
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <Pressable onPress={() => setModalOpen(false)} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Text style={{ ...sans, fontFamily: fonts.sansSemiBold }}>Close</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setModalOpen(false)}
                    style={{ backgroundColor: red, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 10 }}
                  >
                    <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, color: "#ffffff" }}>Confirm</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </Section>

        <Section title="Tables / lists">
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(215, 36, 0, 0.06)",
            }}
          >
            <View style={{ flexDirection: "row", paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#fffaf8" }}>
              {["Order", "Guest", "Total", "Status"].map((col) => (
                <Text key={col} style={{ flex: 1, ...sans, fontFamily: fonts.sansSemiBold, fontSize: 12, color: "#a07060" }}>
                  {col}
                </Text>
              ))}
            </View>
            {[
              { order: "#A1B2C3D4", guest: "Maya Chen", total: "$42.50", status: "Preparing" },
              { order: "#E5F6A7B8", guest: "Jonah Park", total: "$18.00", status: "Ready" },
            ].map((row) => (
              <View
                key={row.order}
                style={{
                  flexDirection: "row",
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: "#f0e8e4",
                }}
              >
                <Text style={{ flex: 1, ...sans, fontSize: 13 }}>{row.order}</Text>
                <Text style={{ flex: 1, ...sans, fontSize: 13 }}>{row.guest}</Text>
                <Text style={{ flex: 1, ...sans, fontFamily: fonts.sansSemiBold, fontSize: 13 }}>{row.total}</Text>
                <Text style={{ flex: 1, ...sans, fontSize: 13 }}>{row.status}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Badges / status indicators" subtitle="Same pills used on the Orders table">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {STATUS_PILLS.map((pill) => (
              <StatusPill key={pill.label} {...pill} />
            ))}
            <View
              style={{
                backgroundColor: "#ffedd5",
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  ...sans,
                  fontSize: 11,
                  fontFamily: fonts.sansSemiBold,
                  color: "#9a3412",
                }}
              >
                Overdue
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(34,197,94,0.12)",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" }} />
              <Text style={{ ...sans, fontFamily: fonts.sansMedium, fontSize: 13 }}>Kitchen Open</Text>
            </View>
          </View>
        </Section>

        <Section title="Navigation elements" subtitle="Sidebar tabs and segmented toggle bars with a sliding pill">
          <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, fontSize: 13 }}>Sidebar</Text>
          <View style={{ flexDirection: "row", backgroundColor: "#ffffff", borderRadius: 16, overflow: "hidden", alignSelf: "flex-start" }}>
            {["Home", "Orders", "Menu", "Customers", "Settings"].map((item, index) => (
              <View
                key={item}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: index === 1 ? "#fff0ed" : "transparent",
                  borderTopRightRadius: 24,
                  borderBottomRightRadius: 24,
                }}
              >
                <Text
                  style={{
                    ...sans,
                    fontFamily: fonts.sansSemiBold,
                    fontSize: 13,
                    color: index === 1 ? red : "rgba(215, 36, 0, 0.55)",
                  }}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>

          <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, fontSize: 13 }}>Menu categories</Text>
          <SegmentedToggleBar
            selected={menuTab}
            onSelect={setMenuTab}
            items={(
              [
                { value: "starters", label: "Starters", count: 4 },
                { value: "mains", label: "Mains", count: 8 },
                { value: "sides", label: "Sides", count: 5 },
                { value: "desserts", label: "Desserts", count: 3 },
              ] as const
            ).map((tab) => ({
              value: tab.value,
              accessibilityLabel: tab.label,
              render: (selected) => (
                <>
                  <Text
                    style={{
                      ...sans,
                      fontSize: 13,
                      fontFamily: selected ? fonts.sansSemiBold : fonts.sansMedium,
                      color: selected ? "#ffffff" : "#a07060",
                      ...segmentedTextTransition,
                    }}
                  >
                    {tab.label}
                  </Text>
                  <Text
                    style={{
                      ...sans,
                      fontSize: 11,
                      fontFamily: fonts.sansBold,
                      color: selected ? "rgba(255,255,255,0.85)" : "rgba(160, 112, 96, 0.6)",
                      ...segmentedTextTransition,
                    }}
                  >
                    {tab.count}
                  </Text>
                </>
              ),
            }))}
          />

          <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, fontSize: 13 }}>Orders status</Text>
          <SegmentedToggleBar
            selected={orderTab}
            onSelect={setOrderTab}
            items={(
              [
                { value: "all", label: "All" },
                { value: "pending", label: "Pending", count: 3 },
                { value: "preparing", label: "Preparing", count: 5 },
                { value: "ready", label: "Ready", count: 2 },
              ] as const
            ).map((tab) => ({
              value: tab.value,
              accessibilityLabel: tab.label,
              render: (selected) => (
                <>
                  <Text
                    style={{
                      ...sans,
                      fontSize: 13,
                      fontFamily: selected ? fonts.sansSemiBold : fonts.sansMedium,
                      color: selected ? "#ffffff" : "#a07060",
                      ...segmentedTextTransition,
                    }}
                  >
                    {tab.label}
                  </Text>
                  {tab.count !== undefined ? (
                    <Text
                      style={{
                        ...sans,
                        fontSize: 11,
                        fontFamily: fonts.sansBold,
                        color: selected ? "rgba(255,255,255,0.85)" : "rgba(160, 112, 96, 0.6)",
                        ...segmentedTextTransition,
                      }}
                    >
                      {tab.count}
                    </Text>
                  ) : null}
                </>
              ),
            }))}
          />

          <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, fontSize: 13 }}>Customer order history (grid / list)</Text>
          <SegmentedToggleBar
            selected={historyView}
            onSelect={setHistoryView}
            pillHeight={32}
            itemStyle={{
              width: 36,
              height: 32,
              paddingVertical: 0,
              paddingHorizontal: 0,
            }}
            items={[
              {
                value: "grid",
                accessibilityLabel: "Grid view",
                render: (selected) => (
                  <Ionicons name="grid-outline" size={16} color={selected ? "#ffffff" : "#a07060" } />
                ),
              },
              {
                value: "list",
                accessibilityLabel: "List view",
                render: (selected) => (
                  <Ionicons name="list-outline" size={16} color={selected ? "#ffffff" : "#a07060" } />
                ),
              },
            ]}
          />
        </Section>

        <Section title="Skeleton / loading states">
          <View style={{ gap: 10 }}>
            <View style={{ height: 18, width: 180, backgroundColor: colors.skeleton, borderRadius: 6 }} />
            <View style={{ height: 14, width: "100%", backgroundColor: colors.skeleton, borderRadius: 6 }} />
            <View style={{ height: 14, width: "72%", backgroundColor: colors.skeleton, borderRadius: 6 }} />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.skeleton }} />
              <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
                <View style={{ height: 12, width: "50%", backgroundColor: colors.skeleton, borderRadius: 6 }} />
                <View style={{ height: 12, width: "30%", backgroundColor: colors.skeleton, borderRadius: 6 }} />
              </View>
            </View>
          </View>
        </Section>

        <Section title="Feedback / toast patterns">
          <Pressable
            onPress={() => showToast("Settings saved")}
            style={{
              alignSelf: "flex-start",
              backgroundColor: "#ffffff",
              borderRadius: 99,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: "rgba(215, 36, 0, 0.15)",
            }}
          >
            <Text style={{ ...sans, fontFamily: fonts.sansSemiBold }}>Show toast</Text>
          </Pressable>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: "rgba(34, 197, 94, 0.12)",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ ...sans, fontFamily: fonts.sansMedium, color: "#15803d" }}>
              Saved — restaurant profile updated
            </Text>
          </View>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: "#fee2e2",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ ...sans, fontFamily: fonts.sansMedium, color: "#991b1b" }}>
              Opening time must be in HH:MM format
            </Text>
          </View>
        </Section>
      </ScrollView>

      {toast ? (
        <View
          style={{
            position: "absolute",
            right: 28,
            bottom: 28,
            backgroundColor: ink,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            ...shadows.lg,
          }}
        >
          <Text style={{ ...sans, fontFamily: fonts.sansMedium, color: "#ffffff" }}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(215, 36, 0, 0.06)",
        padding: 22,
        gap: 14,
      }}
    >
      <View>
        <Text style={{ ...serif, fontSize: 22 }}>{title}</Text>
        {subtitle ? (
          <Text style={{ ...sans, fontSize: 13, color: "#a07060", marginTop: 4 }}>{subtitle}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ minWidth: 220, flexGrow: 1 }}>
      <Text style={{ ...sans, fontFamily: fonts.sansSemiBold, fontSize: 12, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

function RedToggle({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        padding: 2,
        justifyContent: "center",
        backgroundColor: value ? red : "#e5e7eb",
        alignSelf: "flex-start",
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: "#ffffff",
          alignSelf: value ? "flex-end" : "flex-start",
        }}
      />
    </Pressable>
  );
}

function StatusPill({
  label,
  background,
  color,
  icon,
}: {
  label: string;
  background: string;
  color: string;
  icon: ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: background,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Ionicons name={icon} size={12} color={color} />
      <Text
        style={{
          ...sans,
          fontSize: 12,
          fontFamily: fonts.sansSemiBold,
          color,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function PopularItemExample({
  rank,
  name,
  category,
  orders,
  revenue,
  imageUrl,
}: {
  rank: number;
  name: string;
  category: string;
  orders: number;
  revenue: string;
  imageUrl: string;
}) {
  return (
    <View
      style={{
        width: 190,
        backgroundColor: "#ffffff",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      <View style={{ height: 148, backgroundColor: "#e5e7eb", position: "relative" }}>
        <Image source={{ uri: imageUrl }} style={{ width: 190, height: 148 }} resizeMode="cover" />
        <View
          style={{
            position: "absolute",
            left: 7,
            top: 7,
            backgroundColor: red,
            borderRadius: 5,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text style={{ ...sans, color: "#fff", fontSize: 10, fontFamily: fonts.sansBold }}>
            #{rank}
          </Text>
        </View>
        <View
          style={{
            position: "absolute",
            right: 7,
            top: 7,
            backgroundColor: "rgba(255,255,255,0.92)",
            borderRadius: 5,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text style={{ ...sans, color: "#555", fontSize: 9, fontFamily: fonts.sansSemiBold }}>
            {category}
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 11, paddingTop: 9, paddingBottom: 11 }}>
        <Text numberOfLines={1} style={{ ...sans, fontSize: 12, fontFamily: fonts.sansSemiBold }}>
          {name}
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 5,
          }}
        >
          <Text style={{ ...sans, fontSize: 10, color: "#a07060" }}>
            {orders} orders
          </Text>
          <Text style={{ ...sans, fontSize: 11, fontFamily: fonts.sansBold, color: "#7BBFC7" }}>
            {revenue}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MenuItemExample({
  name,
  description,
  price,
  stock,
  available,
  imageUrl,
}: {
  name: string;
  description: string;
  price: string;
  stock: string;
  available: boolean;
  imageUrl: string;
}) {
  return (
    <View
      style={{
        width: 240,
        backgroundColor: "#ffffff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(215, 36, 0, 0.06)",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      <View style={{ height: 148, backgroundColor: "#f5ede8", position: "relative" }}>
        <Image source={{ uri: imageUrl }} style={{ width: "100%", height: 148 }} resizeMode="cover" />
        <View
          style={{
            position: "absolute",
            right: 10,
            top: 10,
            backgroundColor: available ? "#22c55e" : "#9ca3af",
            borderRadius: 99,
            paddingHorizontal: 8,
            paddingVertical: 4,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#ffffff" }} />
          <Text style={{ ...sans, color: "#ffffff", fontSize: 10, fontFamily: fonts.sansSemiBold }}>
            {available ? "Available" : "Unavailable"}
          </Text>
        </View>
      </View>
      <View style={{ padding: 14, gap: 8 }}>
        <Text numberOfLines={1} style={{ ...serif, fontSize: 18 }}>
          {name}
        </Text>
        <Text numberOfLines={2} style={{ ...sans, fontSize: 12, color: "#a07060", minHeight: 36 }}>
          {description}
        </Text>
        <Text style={{ ...sans, fontSize: 16, fontFamily: fonts.sansBold, color: red }}>
          {price}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="layers-outline" size={14} color="#777777" />
          <Text style={{ ...sans, fontSize: 12, color: "#777777" }}>{stock}</Text>
        </View>
      </View>
    </View>
  );
}

function CustomerOrderCardExample({ images }: { images: string[] }) {
  return (
    <View
      style={{
        width: 280,
        backgroundColor: "#ffffff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(215, 36, 0, 0.06)",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      <View style={{ flexDirection: "row", height: 88, backgroundColor: "#fff5f2" }}>
        {images.map((url) => (
          <Image
            key={url}
            source={{ uri: url }}
            style={{ flex: 1, height: "100%" }}
            resizeMode="cover"
          />
        ))}
      </View>
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ gap: 4 }}>
            <Text style={{ ...sans, fontSize: 15, fontFamily: fonts.sansBold, color: red }}>
              #A1B2C3D4
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="time-outline" size={13} color="#a07060" />
              <Text style={{ ...sans, fontSize: 12, color: "#555" }}>Aug 17 • 11:24 AM</Text>
            </View>
          </View>
          <StatusPill
            label="Preparing"
            background="rgba(245, 158, 11, 0.15)"
            color="#F59E0B"
            icon="flame-outline"
          />
        </View>
        <Text style={{ ...sans, fontSize: 14, fontFamily: fonts.sansSemiBold }}>$42.50</Text>
      </View>
    </View>
  );
}

function CustomerOrderRowExample({ images }: { images: string[] }) {
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(215, 36, 0, 0.06)",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 16,
        minHeight: 64,
      }}
    >
      <Text style={{ ...sans, fontSize: 12, fontFamily: fonts.sansMedium, color: "#a07060", width: 24 }}>
        1
      </Text>
      <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansBold, color: red, width: 92 }}>
        #A1B2C3D4
      </Text>
      <View style={{ width: 88, gap: 1 }}>
        <Text style={{ ...sans, fontSize: 12, color: "#555" }}>Aug 17</Text>
        <Text style={{ ...sans, fontSize: 11, color: "#a07060" }}>11:24 AM</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {images.map((url) => (
          <Image
            key={url}
            source={{ uri: url }}
            style={{ width: 36, height: 36, borderRadius: 8 }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ionicons name="restaurant-outline" size={13} color="#555" />
        <Text style={{ ...sans, fontSize: 12, fontFamily: fonts.sansMedium, color: "#555" }}>
          Dine-In
        </Text>
      </View>
      <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansSemiBold }}>$42.50</Text>
      <StatusPill
        label="Preparing"
        background="rgba(245, 158, 11, 0.15)"
        color="#F59E0B"
        icon="flame-outline"
      />
    </View>
  );
}

function fieldStyle(state: "default" | "focus" | "error" | "disabled") {
  const border =
    state === "error"
      ? "#dc2626"
      : state === "focus"
        ? red
        : "rgba(215, 36, 0, 0.15)";

  return {
    backgroundColor: state === "disabled" ? "#f5f5f5" : "#fffaf8",
    borderWidth: 1,
    borderColor: border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: ink,
    opacity: state === "disabled" ? 0.7 : 1,
  };
}
