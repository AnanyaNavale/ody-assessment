import {
  getGetSettingsQueryKey,
  useGetSettings,
  useUpdateSettings,
} from "@ody/api-client";
import { Button, Card, colors, spacing, Toggle, typography } from "@ody/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

const TIME_PATTERN = /^\d{2}:\d{2}$/;

type SettingsForm = {
  restaurantName: string;
  prepTimeMinutes: string;
  autoAcceptOrders: boolean;
  openingTime: string;
  closingTime: string;
};

const EMPTY_FORM: SettingsForm = {
  restaurantName: "",
  prepTimeMinutes: "15",
  autoAcceptOrders: true,
  openingTime: "",
  closingTime: "",
};

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
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
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

    setForm({
      restaurantName: settingsQuery.data.restaurantName,
      prepTimeMinutes: String(settingsQuery.data.prepTimeMinutes),
      autoAcceptOrders: settingsQuery.data.autoAcceptOrders,
      openingTime: settingsQuery.data.openingTime ?? "",
      closingTime: settingsQuery.data.closingTime ?? "",
    });
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
    const restaurantName = form.restaurantName.trim();

    if (!restaurantName) {
      setFeedback({ type: "error", message: "Restaurant name is required" });
      return;
    }

    const prepTimeMinutes = Number(form.prepTimeMinutes);

    if (!Number.isInteger(prepTimeMinutes) || prepTimeMinutes < 5 || prepTimeMinutes > 120) {
      setFeedback({
        type: "error",
        message: "Prep time must be a whole number between 5 and 120",
      });
      return;
    }

    const openingTime = form.openingTime.trim()
      ? normalizeTime(form.openingTime)
      : undefined;
    const closingTime = form.closingTime.trim()
      ? normalizeTime(form.closingTime)
      : undefined;

    if (form.openingTime.trim() && (!openingTime || !TIME_PATTERN.test(openingTime))) {
      setFeedback({
        type: "error",
        message: "Opening time must be in HH:MM format",
      });
      return;
    }

    if (form.closingTime.trim() && (!closingTime || !TIME_PATTERN.test(closingTime))) {
      setFeedback({
        type: "error",
        message: "Closing time must be in HH:MM format",
      });
      return;
    }

    setFeedback(null);
    updateSettings.mutate({
      data: {
        restaurantName,
        prepTimeMinutes,
        autoAcceptOrders: form.autoAcceptOrders,
        ...(openingTime ? { openingTime } : {}),
        ...(closingTime ? { closingTime } : {}),
      },
    });
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
      <Text style={typography.title}>Settings</Text>

      {settingsQuery.isLoading ? (
        <Card>
          <Text style={typography.body}>Loading settings...</Text>
        </Card>
      ) : null}

      {settingsQuery.isError ? (
        <Card>
          <Text style={typography.body}>Unable to load settings</Text>
        </Card>
      ) : null}

      {!settingsQuery.isLoading && !settingsQuery.isError ? (
        <Card style={{ gap: spacing.lg, maxWidth: 520 }}>
          <Field label="Restaurant name">
            <TextInput
              value={form.restaurantName}
              onChangeText={(restaurantName) =>
                setForm((current) => ({ ...current, restaurantName }))
              }
              editable={!disabled}
              placeholder="Restaurant name"
              placeholderTextColor={colors.muted}
              style={inputStyle(disabled)}
            />
          </Field>

          <Field label="Default prep time (minutes)">
            <TextInput
              value={form.prepTimeMinutes}
              onChangeText={(prepTimeMinutes) =>
                setForm((current) => ({ ...current, prepTimeMinutes }))
              }
              editable={!disabled}
              keyboardType="number-pad"
              placeholder="15"
              placeholderTextColor={colors.muted}
              style={inputStyle(disabled)}
            />
          </Field>

          <Field label="Auto accept orders">
            <Toggle
              value={form.autoAcceptOrders}
              disabled={disabled}
              onValueChange={(autoAcceptOrders) =>
                setForm((current) => ({ ...current, autoAcceptOrders }))
              }
            />
          </Field>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.md,
            }}
          >
            <View style={{ flexGrow: 1, minWidth: 140, gap: spacing.sm }}>
              <Text style={typography.caption}>Opens</Text>
              <TextInput
                value={form.openingTime}
                onChangeText={(openingTime) =>
                  setForm((current) => ({ ...current, openingTime }))
                }
                editable={!disabled}
                placeholder="09:00"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                style={inputStyle(disabled)}
              />
            </View>
            <View style={{ flexGrow: 1, minWidth: 140, gap: spacing.sm }}>
              <Text style={typography.caption}>Closes</Text>
              <TextInput
                value={form.closingTime}
                onChangeText={(closingTime) =>
                  setForm((current) => ({ ...current, closingTime }))
                }
                editable={!disabled}
                placeholder="22:00"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                style={inputStyle(disabled)}
              />
            </View>
          </View>

          {feedback ? (
            <Text
              style={{
                ...typography.body,
                color:
                  feedback.type === "success"
                    ? colors.ready.text
                    : colors.danger.background,
              }}
            >
              {feedback.message}
            </Text>
          ) : null}

          <Button
            label={saving ? "Saving..." : "Save Changes"}
            disabled={disabled}
            onPress={save}
          />
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.caption}>{label}</Text>
      {children}
    </View>
  );
}

function inputStyle(disabled: boolean) {
  return {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    opacity: disabled ? 0.6 : 1,
    ...typography.body,
  };
}
