import {
  getGetSettingsQueryKey,
  useGetSettings,
  useUpdateSettings,
} from "@ody/api-client";
import { fonts } from "@ody/shared";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextStyle,
} from "react-native";

const palette = {
  page: "#ffe9e0",
  card: "#ffffff",
  ink: "#1a0800",
  muted: "#a07060",
  dim: "#777777",
  red: "#d72400",
  kitchen: "#22c55e",
  down: "#dc2626",
  hairline: "#f0e8e4",
  tabTrack: "#fff5f2",
  controlBorder: "rgba(215, 36, 0, 0.15)",
  cardBorder: "rgba(215, 36, 0, 0.06)",
  dashed: "rgba(215, 36, 0, 0.22)",
  placeholder: "rgba(51, 51, 51, 0.5)",
  inputBg: "#fffaf8",
};

const serif: TextStyle = {
  fontFamily: fonts.serif,
  color: palette.ink,
};

const sans: TextStyle = {
  fontFamily: fonts.sans,
  color: palette.ink,
};

const SEEDED_PROFILE = {
  restaurantName: "Ember & Co.",
  address: "42 Hearth Lane, San Francisco, CA 94103",
  phone: "+1 (415) 555-0192",
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const QUICK_FILLS = [
  { label: "Lunch", start: "11:00", end: "15:00" },
  { label: "Dinner", start: "17:00", end: "22:00" },
  { label: "All day", start: "09:00", end: "22:00" },
] as const;

const TIME_PATTERN = /^\d{2}:\d{2}$/;

type DayHours = {
  open: boolean;
  start: string;
  end: string;
};

type SettingsForm = {
  restaurantName: string;
  address: string;
  phone: string;
  photoUri: string;
  prepTimeMinutes: number;
  autoAcceptOrders: boolean;
  days: Record<(typeof DAYS)[number], DayHours>;
};

function todayLabel(): string {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

function emptyDays(start: string, end: string): SettingsForm["days"] {
  return Object.fromEntries(
    DAYS.map((day) => [day, { open: true, start, end }]),
  ) as SettingsForm["days"];
}

function normalizeTime(value: string): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return undefined;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return undefined;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const settingsQuery = useGetSettings();
  const kitchenOpen = settingsQuery.data?.serviceAvailable ?? true;
  const [form, setForm] = useState<SettingsForm>({
    restaurantName: SEEDED_PROFILE.restaurantName,
    address: SEEDED_PROFILE.address,
    phone: SEEDED_PROFILE.phone,
    photoUri: "",
    prepTimeMinutes: 18,
    autoAcceptOrders: false,
    days: emptyDays("09:00", "22:00"),
  });
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const updateSettings = useUpdateSettings({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getGetSettingsQueryKey(),
        });
        setFeedback({ type: "success", message: "Settings saved" });
      },
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "Failed to save settings";
        setFeedback({ type: "error", message });
      },
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    const start = settingsQuery.data.openingTime ?? "09:00";
    const end = settingsQuery.data.closingTime ?? "22:00";

    setForm((current) => ({
      ...current,
      restaurantName: settingsQuery.data.restaurantName || SEEDED_PROFILE.restaurantName,
      address: current.address || SEEDED_PROFILE.address,
      phone: current.phone || SEEDED_PROFILE.phone,
      prepTimeMinutes: settingsQuery.data.prepTimeMinutes,
      autoAcceptOrders: settingsQuery.data.autoAcceptOrders,
      days: emptyDays(start, end),
    }));
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const saving = updateSettings.isPending;
  const disabled = saving || settingsQuery.isLoading;

  function save() {
    const restaurantName = form.restaurantName.trim() || SEEDED_PROFILE.restaurantName;
    const openDay = DAYS.map((day) => form.days[day]).find((day) => day.open);
    const openingTime = normalizeTime(openDay?.start ?? "");
    const closingTime = normalizeTime(openDay?.end ?? "");

    if (openDay && (!openingTime || !TIME_PATTERN.test(openingTime))) {
      setFeedback({ type: "error", message: "Opening time must be in HH:MM format" });
      return;
    }

    if (openDay && (!closingTime || !TIME_PATTERN.test(closingTime))) {
      setFeedback({ type: "error", message: "Closing time must be in HH:MM format" });
      return;
    }

    setFeedback(null);
    updateSettings.mutate({
      data: {
        restaurantName,
        prepTimeMinutes: form.prepTimeMinutes,
        autoAcceptOrders: form.autoAcceptOrders,
        ...(openingTime ? { openingTime } : {}),
        ...(closingTime ? { closingTime } : {}),
      },
    });
  }

  function setPrep(next: number) {
    setForm((current) => ({
      ...current,
      prepTimeMinutes: Math.min(120, Math.max(5, next)),
    }));
  }

  function quickFill(start: string, end: string) {
    setForm((current) => ({
      ...current,
      days: Object.fromEntries(
        DAYS.map((day) => [
          day,
          current.days[day].open ? { ...current.days[day], start, end } : current.days[day],
        ]),
      ) as SettingsForm["days"],
    }));
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.page }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 32,
          paddingTop: 28,
          paddingBottom: 108,
          gap: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View>
            <Text
              style={{
                ...sans,
                color: palette.muted,
                fontSize: 13,
                fontFamily: fonts.sansMedium,
                letterSpacing: 1.04,
              }}
            >
              {todayLabel()}
            </Text>
            <Text style={{ ...serif, fontSize: 28, letterSpacing: -0.56, lineHeight: 42, marginTop: 4 }}>
              Settings
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                backgroundColor: palette.card,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 2,
                shadowOffset: { width: 0, height: 1 },
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: kitchenOpen ? palette.kitchen : palette.down,
                }}
              />
              <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansMedium, color: "#333" }}>
                {kitchenOpen ? "Kitchen Open" : "Kitchen Closed"}
              </Text>
            </View>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: palette.red,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ ...sans, color: "#fff", fontFamily: fonts.sansSemiBold, fontSize: 14 }}>
                AN
              </Text>
            </View>
          </View>
        </View>

        {settingsQuery.isError ? (
          <Text style={{ ...sans, color: palette.down }}>Unable to load settings</Text>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
          <View style={{ flexGrow: 1, flexBasis: 420, minWidth: 320, gap: 20 }}>
            <SectionCard
              icon="storefront-outline"
              title="Restaurant Profile"
              subtitle="Basic info displayed to customers"
            >
              <Field label="Storefront Photo">
                <PhotoDropzone
                  uri={form.photoUri}
                  disabled={disabled}
                  onChange={(photoUri) => setForm((current) => ({ ...current, photoUri }))}
                />
              </Field>
              <Field label="Restaurant Name">
                <TextInput
                  value={form.restaurantName}
                  onChangeText={(restaurantName) =>
                    setForm((current) => ({ ...current, restaurantName }))
                  }
                  editable={!disabled}
                  placeholder={SEEDED_PROFILE.restaurantName}
                  placeholderTextColor={palette.placeholder}
                  style={inputStyle(disabled)}
                />
              </Field>
              <Field label="Address">
                <TextInput
                  value={form.address}
                  onChangeText={(address) => setForm((current) => ({ ...current, address }))}
                  editable={!disabled}
                  placeholder={SEEDED_PROFILE.address}
                  placeholderTextColor={palette.placeholder}
                  style={inputStyle(disabled)}
                />
              </Field>
              <Field label="Phone Number">
                <TextInput
                  value={form.phone}
                  onChangeText={(phone) => setForm((current) => ({ ...current, phone }))}
                  editable={!disabled}
                  placeholder={SEEDED_PROFILE.phone}
                  placeholderTextColor={palette.placeholder}
                  keyboardType="phone-pad"
                  style={inputStyle(disabled)}
                />
              </Field>
            </SectionCard>

            <SectionCard
              icon="settings-outline"
              title="Order Management"
              subtitle="Control how orders are received and processed"
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  paddingVertical: 4,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ ...sans, fontSize: 14, fontFamily: fonts.sansSemiBold }}>
                    Default Prep Time
                  </Text>
                  <Text style={{ ...sans, fontSize: 12, color: palette.muted }}>
                    Typical kitchen time before an order is ready
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <StepperButton
                    icon="remove"
                    disabled={disabled || form.prepTimeMinutes <= 5}
                    onPress={() => setPrep(form.prepTimeMinutes - 1)}
                  />
                  <Text style={{ ...sans, fontSize: 14, fontFamily: fonts.sansSemiBold, minWidth: 52, textAlign: "center" }}>
                    {form.prepTimeMinutes} min
                  </Text>
                  <StepperButton
                    icon="add"
                    disabled={disabled || form.prepTimeMinutes >= 120}
                    onPress={() => setPrep(form.prepTimeMinutes + 1)}
                  />
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: palette.hairline, marginVertical: 12 }} />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ ...sans, fontSize: 14, fontFamily: fonts.sansSemiBold }}>
                    Auto-Accept Orders
                  </Text>
                  <Text style={{ ...sans, fontSize: 12, color: palette.muted }}>
                    Send new orders straight to the kitchen
                  </Text>
                </View>
                <RedToggle
                  value={form.autoAcceptOrders}
                  disabled={disabled}
                  onValueChange={(autoAcceptOrders) =>
                    setForm((current) => ({ ...current, autoAcceptOrders }))
                  }
                />
              </View>
            </SectionCard>
          </View>

          <View style={{ flexGrow: 1, flexBasis: 420, minWidth: 320 }}>
            <SectionCard
              icon="time-outline"
              title="Operating Hours"
              subtitle="Open 7 days a week"
            >
              <View style={{ gap: 10 }}>
                {DAYS.map((day) => {
                  const hours = form.days[day];

                  return (
                    <View
                      key={day}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        minHeight: 40,
                      }}
                    >
                      <RedToggle
                        value={hours.open}
                        disabled={disabled}
                        onValueChange={(open) =>
                          setForm((current) => ({
                            ...current,
                            days: {
                              ...current.days,
                              [day]: { ...current.days[day], open },
                            },
                          }))
                        }
                      />
                      <Text
                        style={{
                          ...sans,
                          fontSize: 13,
                          fontFamily: fonts.sansMedium,
                          width: 92,
                          color: hours.open ? palette.ink : palette.muted,
                        }}
                      >
                        {day}
                      </Text>
                      <TextInput
                        value={hours.start}
                        onChangeText={(start) =>
                          setForm((current) => ({
                            ...current,
                            days: {
                              ...current.days,
                              [day]: { ...current.days[day], start },
                            },
                          }))
                        }
                        editable={!disabled && hours.open}
                        placeholder="09:00"
                        placeholderTextColor={palette.placeholder}
                        style={{ ...inputStyle(disabled || !hours.open), width: 88, textAlign: "center" }}
                      />
                      <Text style={{ ...sans, fontSize: 12, color: palette.muted }}>to</Text>
                      <TextInput
                        value={hours.end}
                        onChangeText={(end) =>
                          setForm((current) => ({
                            ...current,
                            days: {
                              ...current.days,
                              [day]: { ...current.days[day], end },
                            },
                          }))
                        }
                        editable={!disabled && hours.open}
                        placeholder="22:00"
                        placeholderTextColor={palette.placeholder}
                        style={{ ...inputStyle(disabled || !hours.open), width: 88, textAlign: "center" }}
                      />
                    </View>
                  );
                })}
              </View>
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: palette.tabTrack,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <Text style={{ ...sans, fontSize: 12, color: palette.muted }}>
                  Quick fill all open days
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {QUICK_FILLS.map((preset) => (
                    <Pressable
                      key={preset.label}
                      disabled={disabled}
                      onPress={() => quickFill(preset.start, preset.end)}
                      style={{
                        borderWidth: 1,
                        borderColor: palette.controlBorder,
                        borderRadius: 99,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: palette.card,
                      }}
                    >
                      <Text
                        style={{
                          ...sans,
                          fontSize: 12,
                          fontFamily: fonts.sansSemiBold,
                          color: palette.red,
                        }}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </SectionCard>
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: palette.card,
          borderTopWidth: 1,
          borderTopColor: palette.hairline,
          paddingHorizontal: 32,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Text style={{ ...sans, fontSize: 13, color: palette.muted, flex: 1 }}>
          {feedback
            ? feedback.message
            : "Review your changes before saving."}
        </Text>
        <Pressable
          onPress={save}
          disabled={disabled}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: disabled ? "#e5e7eb" : palette.red,
            borderRadius: 99,
            paddingHorizontal: 18,
            paddingVertical: 12,
          }}
        >
          <Ionicons name="save-outline" size={16} color={disabled ? "#9ca3af" : "#ffffff"} />
          <Text
            style={{
              ...sans,
              fontFamily: fonts.sansSemiBold,
              fontSize: 14,
              color: disabled ? "#9ca3af" : "#ffffff",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: palette.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.cardBorder,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 24,
          paddingTop: 18,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: palette.hairline,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: "rgba(215, 36, 0, 0.08)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={18} color={palette.red} />
        </View>
        <View>
          <Text style={{ ...serif, fontSize: 18, lineHeight: 27 }}>{title}</Text>
          <Text style={{ ...sans, fontSize: 12, color: palette.muted, marginTop: 2 }}>{subtitle}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 24, paddingVertical: 22, gap: 16 }}>{children}</View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      <Text
        style={{
          ...sans,
          fontSize: 11,
          fontFamily: fonts.sansBold,
          color: palette.muted,
          letterSpacing: 0.88,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function inputStyle(disabled: boolean) {
  return {
    ...sans,
    fontSize: 13,
    backgroundColor: palette.inputBg,
    borderWidth: 1,
    borderColor: palette.controlBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    opacity: disabled ? 0.6 : 1,
  };
}

function RedToggle({
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
        width: 44,
        height: 26,
        borderRadius: 13,
        padding: 2,
        justifyContent: "center",
        backgroundColor: value ? palette.red : "#e5e7eb",
        opacity: disabled ? 0.6 : 1,
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

function StepperButton({
  icon,
  onPress,
  disabled,
}: {
  icon: "add" | "remove";
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.controlBorder,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.tabTrack,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Ionicons name={icon} size={16} color={palette.red} />
    </Pressable>
  );
}

function PhotoDropzone({
  uri,
  onChange,
  disabled,
}: {
  uri: string;
  onChange: (uri: string) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<{ click: () => void } | null>(null);

  return (
    <View>
      <Pressable
        disabled={disabled}
        onPress={() => fileInputRef.current?.click()}
        style={{
          height: 160,
          borderRadius: 12,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: palette.dashed,
          backgroundColor: palette.inputBg,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <View style={{ alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "rgba(215, 36, 0, 0.08)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="image-outline" size={22} color={palette.red} />
            </View>
            <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansMedium }}>
              Click or drag to upload
            </Text>
            <Text style={{ ...sans, fontSize: 11, color: palette.muted }}>
              JPG, PNG, WEBP · max 5 MB
            </Text>
          </View>
        )}
        {uri ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onChange("");
            }}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: "rgba(26, 8, 0, 0.65)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={14} color="#ffffff" />
          </Pressable>
        ) : null}
      </Pressable>
      {Platform.OS === "web" ? (
        <input
          ref={fileInputRef as never}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(event: { target: { files?: FileList | null } }) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }

            if (file.size > 5 * 1024 * 1024) {
              return;
            }

            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") {
                onChange(reader.result);
              }
            };
            reader.readAsDataURL(file);
          }}
        />
      ) : null}
    </View>
  );
}
