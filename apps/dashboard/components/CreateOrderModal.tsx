import {
  getGetCustomersQueryKey,
  getGetDashboardStatsQueryKey,
  getGetOrdersQueryKey,
  useCreateCustomer,
  useCreateOrder,
  useGetCustomers,
  useGetMenuItems,
  useUpdateCustomer,
  type MenuItem,
} from "@ody/api-client";
import { fonts, palette } from "@ody/shared";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextStyle,
} from "react-native";

const serif: TextStyle = {
  fontFamily: fonts.serif,
  color: palette.ink,
};

const sans: TextStyle = {
  fontFamily: fonts.sans,
  color: palette.ink,
};

const ORDER_TYPES = [
  { value: "dine_in", label: "Dine-In", icon: "restaurant-outline" as const },
  { value: "pickup", label: "Pickup", icon: "bag-outline" as const },
  { value: "delivery", label: "Delivery", icon: "car-outline" as const },
] as const;

type OrderTypeValue = (typeof ORDER_TYPES)[number]["value"];

type DraftLine = {
  key: string;
  menuItemId: string;
  quantity: string;
  notes: string;
};

function newLine(): DraftLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    menuItemId: "",
    quantity: "1",
    notes: "",
  };
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return asRecord(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }
  }

  return null;
}

function firstZodIssue(payload: Record<string, unknown> | null): string | null {
  const nested = payload?.error;
  const issues =
    nested && typeof nested === "object" && "issues" in nested
      ? (nested as { issues?: Array<{ message?: string; path?: unknown }> }).issues
      : null;

  const first = issues?.[0];
  if (!first?.message) {
    return null;
  }

  if (String(first.path ?? "").includes("email") || /email/i.test(first.message)) {
    return "Please enter a valid email address.";
  }

  return first.message;
}

function errorMessage(error: unknown): string {
  const axiosData =
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
      ? (error.response as { data?: unknown }).data
      : undefined;

  const payload =
    asRecord(axiosData) ??
    (error instanceof Error ? asRecord(error.message) : asRecord(error));

  const raw =
    (typeof payload?.message === "string" && payload.message) ||
    firstZodIssue(payload) ||
    (typeof payload?.error === "string" && payload.error) ||
    (error instanceof Error ? error.message : "") ||
    "Something went wrong. Please try again.";

  if (
    /already exists|already on file|duplicate key|unique constraint|23505/i.test(
      raw,
    )
  ) {
    return "This email is already on file for another guest. Select that guest from the list, or use a different email.";
  }

  if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
    return "Something went wrong. Please check the guest details and try again.";
  }

  if (/status code 400/i.test(raw)) {
    return "Please check the guest name, email, and order items, then try again.";
  }

  return raw;
}

function isAvailableItem(item: MenuItem): boolean {
  return item.stockQuantity !== 0;
}

export function CreateOrderModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const customersQuery = useGetCustomers({ limit: 100 });
  const menuItemsQuery = useGetMenuItems();
  const [customerId, setCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [showCustomers, setShowCustomers] = useState(false);
  const [orderType, setOrderType] = useState<OrderTypeValue>("dine_in");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const customers = customersQuery.data ?? [];
  const menuItems = (menuItemsQuery.data ?? []).filter(isAvailableItem);
  const taxRate = 0.08;
  const selectedCustomer = customers.find((customer) => customer.id === customerId);

  const filteredCustomers = useMemo(() => {
    const needle = customerQuery.trim().toLowerCase();

    if (!needle) {
      return customers.slice(0, 8);
    }

    return customers
      .filter((customer) =>
        [customer.name, customer.email, customer.phone ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [customerQuery, customers]);

  const parsedLines = lines
    .map((line) => {
      const item = menuItems.find((entry) => entry.id === line.menuItemId);
      const quantity = Number(line.quantity);

      if (!item || !Number.isInteger(quantity) || quantity < 1) {
        return null;
      }

      return {
        item,
        quantity,
        notes: line.notes.trim(),
        subtotal: Number(item.price) * quantity,
      };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);

  const subtotal = parsedLines.reduce((sum, line) => sum + line.subtotal, 0);
  const tax = subtotal * (Number.isFinite(taxRate) ? taxRate : 0.08);
  const total = subtotal + tax;
  const guestName = customerQuery.trim();
  const isReturningGuest = Boolean(customerId);
  const isNewGuest = !isReturningGuest && guestName.length > 0;
  const guestEmailValid = guestEmail.trim().includes("@") && guestEmail.trim().includes(".");
  const canSubmit =
    parsedLines.length > 0 &&
    guestName.length > 0 &&
    guestEmailValid &&
    (isReturningGuest || isNewGuest);

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() }),
          queryClient.invalidateQueries({
            queryKey: getGetDashboardStatsQueryKey(),
          }),
        ]);
        setSuccess(true);
        setError(null);
      },
      onError: (err) => {
        setError(errorMessage(err));
      },
    },
  });

  function reset() {
    setCustomerId("");
    setCustomerQuery("");
    setGuestEmail("");
    setGuestPhone("");
    setShowCustomers(false);
    setOrderType("dine_in");
    setNotes("");
    setLines([newLine()]);
    setError(null);
    setSuccess(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function submit() {
    if (
      !canSubmit ||
      createOrder.isPending ||
      createCustomer.isPending ||
      updateCustomer.isPending
    ) {
      return;
    }

    setError(null);

    try {
      let nextCustomerId = customerId;
      const phone = guestPhone.trim() === "" ? null : guestPhone.trim();
      const email = guestEmail.trim();

      if (!nextCustomerId) {
        const created = await createCustomer.mutateAsync({
          data: {
            name: guestName,
            email,
            phone,
          },
        });
        nextCustomerId = created.id;
        await queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
      } else {
        const emailChanged = email !== (selectedCustomer?.email ?? "");
        const phoneChanged = phone !== (selectedCustomer?.phone ?? null);

        if (emailChanged || phoneChanged) {
          await updateCustomer.mutateAsync({
            id: nextCustomerId,
            data: {
              email,
              phone,
            },
          });
          await queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        }
      }

      createOrder.mutate({
        data: {
          customerId: nextCustomerId,
          orderType,
          notes: notes.trim() === "" ? undefined : notes.trim(),
          items: parsedLines.map((line) => ({
            menuItemId: line.item.id,
            quantity: line.quantity,
            notes: line.notes === "" ? undefined : line.notes,
          })),
        },
      });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(26, 8, 0, 0.45)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 640,
            maxHeight: "90%",
            backgroundColor: palette.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.cardBorder,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          <View
            style={{
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: palette.hairline,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ ...serif, fontSize: 22, lineHeight: 28 }}>Create an Order</Text>
            <Pressable onPress={close} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.muted} />
            </Pressable>
          </View>

          {success ? (
            <View style={{ padding: 24, gap: 12 }}>
              <Text style={{ ...sans, fontSize: 14, color: palette.muted, lineHeight: 21 }}>
                The order has been placed and is now pending in the kitchen.
              </Text>
              <Pressable
                onPress={close}
                style={{
                  backgroundColor: palette.red,
                  borderRadius: 99,
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    ...sans,
                    color: "#ffffff",
                    fontFamily: fonts.sansSemiBold,
                    fontSize: 14,
                  }}
                >
                  Done
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
              <Field label="Customer" required>
                <TextInput
                  value={selectedCustomer && !showCustomers ? selectedCustomer.name : customerQuery}
                  onChangeText={(value) => {
                    setCustomerQuery(value);
                    setCustomerId("");
                    setGuestEmail("");
                    setGuestPhone("");
                    setShowCustomers(true);
                  }}
                  onFocus={() => setShowCustomers(true)}
                  placeholder="Search a guest or type a new name"
                  placeholderTextColor={palette.placeholder}
                  style={inputStyle}
                />
                {showCustomers ? (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: palette.hairline,
                      borderRadius: 12,
                      overflow: "hidden",
                      marginTop: 6,
                    }}
                  >
                    {isNewGuest ? (
                      <Pressable
                        onPress={() => setShowCustomers(false)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: filteredCustomers.length > 0 ? 1 : 0,
                          borderBottomColor: palette.hairline,
                          backgroundColor: palette.tabTrack,
                        }}
                      >
                        <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansSemiBold, color: palette.red }}>
                          Create new guest “{guestName}”
                        </Text>
                        <Text style={{ ...sans, fontSize: 12, color: palette.muted }}>
                          Enter email and phone below
                        </Text>
                      </Pressable>
                    ) : null}
                    {filteredCustomers.length === 0 && !isNewGuest ? (
                      <Text style={{ ...sans, fontSize: 13, color: palette.muted, padding: 12 }}>
                        Type a name to add a new guest
                      </Text>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <Pressable
                          key={customer.id}
                          onPress={() => {
                            setCustomerId(customer.id);
                            setCustomerQuery(customer.name);
                            setGuestEmail(customer.email);
                            setGuestPhone(customer.phone ?? "");
                            setShowCustomers(false);
                          }}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderBottomWidth: 1,
                            borderBottomColor: palette.hairline,
                            backgroundColor:
                              customer.id === customerId ? palette.tabTrack : palette.card,
                          }}
                        >
                          <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansSemiBold }}>
                            {customer.name}
                          </Text>
                          <Text style={{ ...sans, fontSize: 12, color: palette.muted }}>
                            {customer.email}
                          </Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                ) : null}
              </Field>

              {isReturningGuest || isNewGuest ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  <View style={{ flexGrow: 1, flexBasis: 220, minWidth: 180 }}>
                    <Field label="Email" required>
                      <TextInput
                        value={guestEmail}
                        onChangeText={setGuestEmail}
                        placeholder="guest@email.com"
                        placeholderTextColor={palette.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        style={inputStyle}
                      />
                    </Field>
                  </View>
                  <View style={{ flexGrow: 1, flexBasis: 180, minWidth: 160 }}>
                    <Field label="Phone">
                      <TextInput
                        value={guestPhone}
                        onChangeText={setGuestPhone}
                        placeholder="Optional"
                        placeholderTextColor={palette.placeholder}
                        keyboardType="phone-pad"
                        style={inputStyle}
                      />
                    </Field>
                  </View>
                </View>
              ) : null}

              <Field label="Order Type" required>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {ORDER_TYPES.map((type) => {
                    const selected = orderType === type.value;

                    return (
                      <Pressable
                        key={type.value}
                        onPress={() => setOrderType(type.value)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: selected ? palette.red : palette.tabTrack,
                          borderRadius: 99,
                          paddingVertical: 8,
                          paddingHorizontal: 14,
                        }}
                      >
                        <Ionicons
                          name={type.icon}
                          size={14}
                          color={selected ? "#ffffff" : palette.muted}
                        />
                        <Text
                          style={{
                            ...sans,
                            fontSize: 13,
                            fontFamily: selected ? fonts.sansSemiBold : fonts.sansMedium,
                            color: selected ? "#ffffff" : palette.muted,
                          }}
                        >
                          {type.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <Field label="Items" required>
                <View style={{ gap: 12 }}>
                  {lines.map((line, index) => {
                    const selectedItem = menuItems.find((item) => item.id === line.menuItemId);

                    return (
                      <View
                        key={line.key}
                        style={{
                          borderWidth: 1,
                          borderColor: palette.hairline,
                          borderRadius: 12,
                          padding: 12,
                          gap: 10,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              ...sans,
                              fontSize: 12,
                              fontFamily: fonts.sansSemiBold,
                              color: palette.muted,
                            }}
                          >
                            Item {index + 1}
                          </Text>
                          {lines.length > 1 ? (
                            <Pressable
                              onPress={() =>
                                setLines((current) => current.filter((entry) => entry.key !== line.key))
                              }
                            >
                              <Text style={{ ...sans, fontSize: 12, color: palette.red }}>Remove</Text>
                            </Pressable>
                          ) : null}
                        </View>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                          {menuItems.map((item) => {
                            const selected = line.menuItemId === item.id;

                            return (
                              <Pressable
                                key={item.id}
                                onPress={() =>
                                  setLines((current) =>
                                    current.map((entry) =>
                                      entry.key === line.key
                                        ? { ...entry, menuItemId: item.id }
                                        : entry,
                                    ),
                                  )
                                }
                                style={{
                                  backgroundColor: selected ? palette.red : palette.tabTrack,
                                  borderRadius: 99,
                                  paddingVertical: 6,
                                  paddingHorizontal: 10,
                                }}
                              >
                                <Text
                                  style={{
                                    ...sans,
                                    fontSize: 12,
                                    fontFamily: selected ? fonts.sansSemiBold : fonts.sansMedium,
                                    color: selected ? "#ffffff" : palette.muted,
                                  }}
                                >
                                  {item.name} · {formatMoney(Number(item.price))}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                          <Text style={{ ...sans, fontSize: 12, color: palette.muted }}>Qty</Text>
                          <Pressable
                            onPress={() =>
                              setLines((current) =>
                                current.map((entry) =>
                                  entry.key === line.key
                                    ? {
                                        ...entry,
                                        quantity: String(Math.max(1, Number(entry.quantity || 1) - 1)),
                                      }
                                    : entry,
                                ),
                              )
                            }
                            style={stepperButton}
                          >
                            <Ionicons name="remove" size={14} color={palette.ink} />
                          </Pressable>
                          <TextInput
                            value={line.quantity}
                            onChangeText={(quantity) =>
                              setLines((current) =>
                                current.map((entry) =>
                                  entry.key === line.key ? { ...entry, quantity } : entry,
                                ),
                              )
                            }
                            keyboardType="number-pad"
                            style={[inputStyle, { width: 56, textAlign: "center" }]}
                          />
                          <Pressable
                            onPress={() =>
                              setLines((current) =>
                                current.map((entry) =>
                                  entry.key === line.key
                                    ? {
                                        ...entry,
                                        quantity: String(Math.min(99, Number(entry.quantity || 1) + 1)),
                                      }
                                    : entry,
                                ),
                              )
                            }
                            style={stepperButton}
                          >
                            <Ionicons name="add" size={14} color={palette.ink} />
                          </Pressable>
                          {selectedItem ? (
                            <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansSemiBold }}>
                              {formatMoney(Number(selectedItem.price) * Number(line.quantity || 0))}
                            </Text>
                          ) : null}
                        </View>
                        <TextInput
                          value={line.notes}
                          onChangeText={(value) =>
                            setLines((current) =>
                              current.map((entry) =>
                                entry.key === line.key ? { ...entry, notes: value } : entry,
                              ),
                            )
                          }
                          placeholder="Item notes (optional)"
                          placeholderTextColor={palette.placeholder}
                          style={inputStyle}
                        />
                      </View>
                    );
                  })}
                  <Pressable
                    onPress={() => setLines((current) => [...current, newLine()])}
                    style={{
                      alignSelf: "flex-start",
                      borderRadius: 99,
                      backgroundColor: palette.tabTrack,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                    }}
                  >
                    <Text style={{ ...sans, fontSize: 13, fontFamily: fonts.sansSemiBold, color: palette.red }}>
                      + Add item
                    </Text>
                  </Pressable>
                </View>
              </Field>

              <Field label="Order notes">
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Allergies, special requests, table number…"
                  placeholderTextColor={palette.placeholder}
                  multiline
                  style={[inputStyle, { height: 72, textAlignVertical: "top" }]}
                />
              </Field>

              <View
                style={{
                  backgroundColor: "#fffaf8",
                  borderRadius: 12,
                  padding: 14,
                  gap: 8,
                }}
              >
                <SummaryRow label="Subtotal" value={formatMoney(subtotal)} />
                <SummaryRow
                  label={`Tax (${Math.round((Number.isFinite(taxRate) ? taxRate : 0.08) * 100)}%)`}
                  value={formatMoney(tax)}
                />
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 4 }}>
                  <Text style={{ ...sans, fontSize: 15, fontFamily: fonts.sansBold }}>Total</Text>
                  <Text
                    style={{
                      ...sans,
                      fontSize: 18,
                      fontFamily: fonts.sansBold,
                      color: palette.red,
                    }}
                  >
                    {formatMoney(total)}
                  </Text>
                </View>
              </View>

              {error ? (
                <Text style={{ ...sans, fontSize: 13, color: palette.down }}>{error}</Text>
              ) : null}

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={submit}
                  disabled={
                    !canSubmit ||
                    createOrder.isPending ||
                    createCustomer.isPending ||
                    updateCustomer.isPending
                  }
                  style={{
                    flex: 1,
                    backgroundColor: canSubmit ? palette.red : "#e5e7eb",
                    borderRadius: 99,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      ...sans,
                      color: canSubmit ? "#ffffff" : "#9ca3af",
                      fontFamily: fonts.sansSemiBold,
                      fontSize: 14,
                    }}
                  >
                    {createOrder.isPending ||
                    createCustomer.isPending ||
                    updateCustomer.isPending
                      ? "Placing order..."
                      : "Place Order"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={close}
                  style={{
                    borderRadius: 99,
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    backgroundColor: palette.tabTrack,
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ ...sans, color: palette.muted, fontFamily: fonts.sansSemiBold }}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          ...sans,
          fontSize: 12,
          fontFamily: fonts.sansSemiBold,
          color: palette.muted,
          letterSpacing: 0.84,
          textTransform: "uppercase",
        }}
      >
        {label}
        {required ? (
          <Text style={{ color: palette.red, fontFamily: fonts.sansSemiBold }}> *</Text>
        ) : null}
      </Text>
      {children}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ ...sans, fontSize: 13, color: palette.dim }}>{label}</Text>
      <Text style={{ ...sans, fontSize: 13, color: "#333" }}>{value}</Text>
    </View>
  );
}

const inputStyle = {
  ...sans,
  fontSize: 13,
  backgroundColor: palette.card,
  borderWidth: 1,
  borderColor: palette.controlBorder,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 9,
  width: "100%" as const,
};

const stepperButton = {
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: palette.tabTrack,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
