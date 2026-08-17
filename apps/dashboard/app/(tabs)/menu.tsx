import {
  getGetCategoriesQueryKey,
  getGetMenuItemsQueryKey,
  useCreateMenuItem,
  useDeleteMenuItem,
  useGetCategories,
  useGetMenuItems,
  useGetSettings,
  useUpdateCategory,
  useUpdateMenuItem,
  type Category,
  type MenuItem,
} from "@ody/api-client";
import { fonts } from "@ody/shared";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Image,
  Modal,
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
  dim: "#b09080",
  axis: "#c0a898",
  red: "#d72400",
  kitchen: "#22c55e",
  down: "#dc2626",
  hairline: "#f0e8e4",
  tabTrack: "#fff5f2",
  controlBorder: "rgba(215, 36, 0, 0.15)",
  cardBorder: "rgba(215, 36, 0, 0.06)",
  placeholder: "rgba(51, 51, 51, 0.5)",
};

const serif: TextStyle = {
  fontFamily: fonts.serif,
  color: palette.ink,
};

const sans: TextStyle = {
  fontFamily: fonts.sans,
  color: palette.ink,
};

type ItemFormState = {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  isAvailable: boolean;
  stockQuantity: string;
  imageUrl: string;
};

const emptyForm: ItemFormState = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  isAvailable: true,
  stockQuantity: "",
  imageUrl: "",
};

function errorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data
  ) {
    return String(error.response.data.message);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function parsedStock(value: string): number | null {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  return Number(trimmed);
}

function isNegativeStock(value: string): boolean {
  const stock = parsedStock(value);
  return stock !== null && Number.isFinite(stock) && stock < 0;
}

function availabilityFromStockInput(value: string): boolean {
  const stock = parsedStock(value);

  if (stock === null || !Number.isFinite(stock) || stock < 0) {
    return true;
  }

  return stock !== 0;
}

function hasRequiredItemFields(form: ItemFormState): boolean {
  return (
    form.name.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.price.trim().length > 0 &&
    !Number.isNaN(Number(form.price)) &&
    form.imageUrl.trim().length > 0
  );
}

function formFromItem(item: MenuItem): ItemFormState {
  return {
    name: item.name,
    description: item.description ?? "",
    price: item.price,
    categoryId: item.categoryId,
    isAvailable: item.stockQuantity !== 0,
    stockQuantity: item.stockQuantity === null ? "" : String(item.stockQuantity),
    imageUrl: item.imageUrl ?? "",
  };
}

function validateForm(form: ItemFormState): string | null {
  if (form.name.trim().length === 0) {
    return "Name is required";
  }

  if (form.description.trim().length === 0) {
    return "Description is required";
  }

  if (form.price.trim().length === 0) {
    return "Price is required";
  }

  if (Number.isNaN(Number(form.price))) {
    return "Price must be a number";
  }

  if (form.imageUrl.trim().length === 0) {
    return "Image is required";
  }

  if (form.categoryId.length === 0) {
    return "Category is required";
  }

  if (isNegativeStock(form.stockQuantity)) {
    return "Stock quantity cannot be a negative number";
  }

  if (
    form.stockQuantity.trim().length > 0 &&
    !Number.isInteger(Number(form.stockQuantity))
  ) {
    return "Stock quantity must be an integer or empty";
  }

  return null;
}

function toPayload(form: ItemFormState) {
  const stockQuantity = parsedStock(form.stockQuantity);

  return {
    name: form.name.trim(),
    description: form.description.trim() === "" ? null : form.description.trim(),
    price: form.price.trim(),
    categoryId: form.categoryId,
    isAvailable: availabilityFromStockInput(form.stockQuantity),
    stockQuantity,
    imageUrl: form.imageUrl.trim() === "" ? null : form.imageUrl.trim(),
  };
}

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

function formatMoney(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(amount)) {
    return `$${value}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function MenuScreen() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ itemId?: string | string[]; t?: string | string[] }>();
  const itemIdParam = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const itemFocusKey = Array.isArray(params.t) ? params.t[0] : params.t;
  const [form, setForm] = useState<ItemFormState>(emptyForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(
    null,
  );
  const appliedItemKey = useRef<string | null>(null);
  const pageScrollRef = useRef<ScrollView>(null);

  const settingsQuery = useGetSettings();
  const categoriesQuery = useGetCategories();
  const menuItemsQuery = useGetMenuItems();
  const kitchenOpen = settingsQuery.data?.serviceAvailable ?? true;

  const invalidateMenuItems = () =>
    queryClient.invalidateQueries({ queryKey: getGetMenuItemsQueryKey() });

  const updateCategory = useUpdateCategory({
    mutation: {
      onError: (error) => {
        setDialog({
          title: "Could not reorder categories",
          message: errorMessage(error),
        });
        void queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
      },
    },
  });

  const createMenuItem = useCreateMenuItem({
    mutation: {
      onSuccess: async () => {
        await invalidateMenuItems();
        setForm((current) => ({
          ...emptyForm,
          categoryId: current.categoryId,
        }));
        setDialog({
          title: "Item created",
          message: "Your new menu item has been added.",
        });
      },
      onError: (error) => {
        setDialog({
          title: "Could not create item",
          message: errorMessage(error),
        });
      },
    },
  });

  const updateMenuItem = useUpdateMenuItem({
    mutation: {
      onSuccess: async () => {
        await invalidateMenuItems();
        setEditingItemId(null);
        setForm((current) => ({
          ...emptyForm,
          categoryId: current.categoryId,
        }));
        setDialog({
          title: "Item updated",
          message: "Your menu item changes have been saved.",
        });
      },
      onError: (error) => {
        setDialog({
          title: "Could not update item",
          message: errorMessage(error),
        });
      },
    },
  });

  const deleteMenuItem = useDeleteMenuItem({
    mutation: {
      onSuccess: async () => {
        await invalidateMenuItems();
        setDialog({
          title: "Item deleted",
          message: "The menu item has been removed.",
        });
      },
      onError: (error) => {
        setDialog({
          title: "Could not delete item",
          message: errorMessage(error),
        });
      },
    },
  });

  const categories = categoriesQuery.data ?? [];
  const menuItems = menuItemsQuery.data ?? [];

  async function persistCategoryOrder(next: Category[]) {
    const withOrder = next.map((category, index) => ({
      ...category,
      displayOrder: index,
    }));

    queryClient.setQueryData(getGetCategoriesQueryKey(), withOrder);

    try {
      await Promise.all(
        withOrder.map((category) =>
          updateCategory.mutateAsync({
            id: category.id,
            data: { displayOrder: category.displayOrder },
          }),
        ),
      );

      await queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
    } catch {
      await queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
    }
  }

  const activeCategoryId = selectedCategoryId ?? categories[0]?.id ?? null;
  const activeCategory = categories.find((category) => category.id === activeCategoryId);

  const formWithCategory =
    form.categoryId || !categories[0]
      ? form
      : { ...form, categoryId: categories[0].id };

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return menuItems.filter((item) => {
      if (activeCategoryId && item.categoryId !== activeCategoryId) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return [item.name, item.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [activeCategoryId, menuItems, search]);

  const availableCount = menuItems.filter((item) => item.stockQuantity !== 0).length;
  const requiredReady = hasRequiredItemFields(formWithCategory);
  const negativeStock = isNegativeStock(formWithCategory.stockQuantity);
  const formBusy = createMenuItem.isPending || updateMenuItem.isPending;
  const canSubmit = requiredReady && !negativeStock && !formBusy;

  function submitForm() {
    if (!canSubmit) {
      return;
    }

    const validationError = validateForm(formWithCategory);

    if (validationError) {
      setDialog({
        title: "Check the form",
        message: validationError,
      });
      return;
    }

    const data = toPayload(formWithCategory);

    if (editingItemId) {
      updateMenuItem.mutate({ id: editingItemId, data });
      return;
    }

    createMenuItem.mutate({ data });
  }

  function startEdit(item: MenuItem) {
    setEditingItemId(item.id);
    setForm(formFromItem(item));
    setSelectedCategoryId(item.categoryId);
    pageScrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  useEffect(() => {
    if (!itemIdParam || menuItems.length === 0) {
      return;
    }

    const focusKey = `${itemIdParam}:${itemFocusKey ?? ""}`;

    if (appliedItemKey.current === focusKey) {
      return;
    }

    const item = menuItems.find((entry) => entry.id === itemIdParam);

    if (!item) {
      return;
    }

    appliedItemKey.current = focusKey;
    startEdit(item);
  }, [itemIdParam, itemFocusKey, menuItems]);

  function cancelEdit() {
    setEditingItemId(null);
    setForm((current) => ({
      ...emptyForm,
      categoryId: current.categoryId,
    }));
  }

  return (
    <>
    <ScrollView
      ref={pageScrollRef}
      style={{ flex: 1, backgroundColor: palette.page }}
      contentContainerStyle={{
        paddingHorizontal: 32,
        paddingTop: 28,
        paddingBottom: 32,
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
          <Text
            style={{
              ...serif,
              fontSize: 32,
              letterSpacing: -0.4,
              lineHeight: 40,
              marginTop: 4,
            }}
          >
            Menu
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

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "stretch",
          gap: 20,
        }}
      >
        <Panel style={{ width: 220, flexGrow: 0, flexShrink: 0 }}>
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: palette.hairline,
            }}
          >
            <Text style={{ ...serif, fontSize: 17, lineHeight: 25.5 }}>Categories</Text>
            <Text style={{ ...sans, fontSize: 12, color: palette.dim, marginTop: 3 }}>
              Drag rows to reorder
            </Text>
          </View>
          <View
            style={{
              backgroundColor: "#fffaf8",
              borderBottomWidth: 1,
              borderBottomColor: palette.hairline,
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                width: 36,
                ...sans,
                fontSize: 10,
                fontFamily: fonts.sansBold,
                color: palette.axis,
                letterSpacing: 0.7,
              }}
            >
              #
            </Text>
            <Text
              style={{
                flex: 1,
                ...sans,
                fontSize: 10,
                fontFamily: fonts.sansBold,
                color: palette.axis,
                letterSpacing: 0.7,
              }}
            >
              CATEGORY
            </Text>
          </View>
          {categoriesQuery.isLoading ? (
            <Text style={{ ...sans, padding: 16, color: palette.muted }}>Loading categories...</Text>
          ) : null}
          {categoriesQuery.isError ? (
            <View style={{ padding: 16, gap: 8 }}>
              <Text style={{ ...sans, color: palette.down }}>
                Failed to load categories: {errorMessage(categoriesQuery.error)}
              </Text>
              <Pressable onPress={() => void categoriesQuery.refetch()}>
                <Text style={{ ...sans, color: palette.red, fontFamily: fonts.sansSemiBold }}>
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : null}
          <CategoryReorderList
            categories={categories}
            disabled={updateCategory.isPending}
            onReorder={(next) => {
              void persistCategoryOrder(next);
            }}
          />
        </Panel>

        <Panel style={{ flexGrow: 1, flexBasis: 560, minWidth: 360 }}>
          <View
            style={{
              paddingHorizontal: 24,
              paddingTop: 18,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: palette.hairline,
            }}
          >
            <Text style={{ ...serif, fontSize: 17, lineHeight: 25.5 }}>
              {editingItemId ? "Edit Menu Item" : "New Menu Item"}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 24, paddingVertical: 20, gap: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "stretch",
                justifyContent: "space-between",
                gap: 20,
              }}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
                <Field label="Name" required>
                  <TextInput
                    value={formWithCategory.name}
                    onChangeText={(name) => setForm((current) => ({ ...current, name }))}
                    placeholder="e.g. Truffle Arancini"
                    placeholderTextColor={palette.placeholder}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Description" required style={{ flex: 1 }}>
                  <TextInput
                    value={formWithCategory.description}
                    onChangeText={(description) =>
                      setForm((current) => ({ ...current, description }))
                    }
                    placeholder="Describe the dish, key ingredients and preparation..."
                    placeholderTextColor={palette.placeholder}
                    multiline
                    style={[
                      inputStyle,
                      { flex: 1, minHeight: 120, textAlignVertical: "top" },
                    ]}
                  />
                </Field>
                <Field label="Price" required>
                  <View style={{ position: "relative" }}>
                    <Text
                      style={{
                        position: "absolute",
                        left: 12,
                        top: 11,
                        ...sans,
                        fontSize: 13,
                        color: palette.muted,
                        zIndex: 1,
                      }}
                    >
                      $
                    </Text>
                    <TextInput
                      value={formWithCategory.price}
                      onChangeText={(price) => setForm((current) => ({ ...current, price }))}
                      placeholder="0.00"
                      placeholderTextColor={palette.placeholder}
                      keyboardType="decimal-pad"
                      style={[inputStyle, { paddingLeft: 24 }]}
                    />
                  </View>
                </Field>
              </View>
              <View style={{ width: 200, flexShrink: 0, gap: 10 }}>
                <ImageUploadField
                  uri={formWithCategory.imageUrl}
                  required
                  onChange={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))}
                />
                <Field label="Image URL" required>
                  <TextInput
                    value={
                      formWithCategory.imageUrl.startsWith("data:")
                        ? ""
                        : formWithCategory.imageUrl
                    }
                    onChangeText={(imageUrl) =>
                      setForm((current) => ({ ...current, imageUrl }))
                    }
                    placeholder={
                      formWithCategory.imageUrl.startsWith("data:")
                        ? "Or paste a URL"
                        : "https://example.com/dish.jpg"
                    }
                    placeholderTextColor={palette.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={inputStyle}
                  />
                </Field>
              </View>
            </View>
            <Field label="Category">
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {categories.map((category) => {
                  const selected = formWithCategory.categoryId === category.id;

                  return (
                    <Pressable
                      key={category.id}
                      onPress={() =>
                        setForm((current) => ({ ...current, categoryId: category.id }))
                      }
                      style={{
                        backgroundColor: selected ? palette.red : palette.tabTrack,
                        borderRadius: 99,
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                      }}
                    >
                      <Text
                        style={{
                          ...sans,
                          fontSize: 13,
                          fontFamily: selected ? fonts.sansSemiBold : fonts.sansMedium,
                          color: selected ? "#ffffff" : palette.muted,
                        }}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "nowrap",
                gap: 16,
                alignItems: "flex-end",
              }}
            >
              <View style={{ flexShrink: 0 }}>
              <Field label="Availability">
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 40 }}>
                  <AvailabilitySwitch
                    value={formWithCategory.isAvailable}
                    onValueChange={(isAvailable) =>
                      setForm((current) => {
                        if (!isAvailable) {
                          return {
                            ...current,
                            isAvailable: false,
                            stockQuantity: "0",
                          };
                        }

                        return {
                          ...current,
                          isAvailable: true,
                          stockQuantity:
                            current.stockQuantity.trim() === "0"
                              ? ""
                              : current.stockQuantity,
                        };
                      })
                    }
                  />
                    <Text
                      style={{
                        ...sans,
                        fontSize: 13,
                        fontFamily: fonts.sansSemiBold,
                        color: formWithCategory.isAvailable ? palette.kitchen : palette.muted,
                      }}
                    >
                      {formWithCategory.isAvailable ? "Available" : "Unavailable"}
                    </Text>
                  </View>
                </Field>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Field label="Stock Quantity">
                  <TextInput
                    value={formWithCategory.stockQuantity}
                    onChangeText={(stockQuantity) =>
                      setForm((current) => ({
                        ...current,
                        stockQuantity,
                        isAvailable: availabilityFromStockInput(stockQuantity),
                      }))
                    }
                    placeholder="Empty = Unlimited"
                    placeholderTextColor={palette.placeholder}
                    keyboardType="numeric"
                    style={inputStyle}
                  />
                  {negativeStock ? (
                    <Text
                      style={{
                        ...sans,
                        fontSize: 11,
                        color: palette.down,
                        marginTop: 2,
                      }}
                    >
                      Quantity cannot be negative.
                    </Text>
                  ) : null}
                </Field>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={submitForm}
                disabled={!canSubmit}
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
                  {formBusy
                    ? "Saving..."
                    : editingItemId
                      ? "Save Changes"
                      : "Create Menu Item"}
                </Text>
              </Pressable>
              {editingItemId ? (
                <Pressable
                  onPress={cancelEdit}
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
              ) : null}
            </View>
          </View>
        </Panel>
      </View>

      <Panel>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: palette.hairline,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              backgroundColor: palette.tabTrack,
              borderRadius: 99,
              padding: 4,
              gap: 2,
            }}
          >
            {categories.map((category) => {
              const selected = category.id === activeCategoryId;
              const count = menuItems.filter((item) => item.categoryId === category.id).length;

              return (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedCategoryId(category.id)}
                  style={{
                    backgroundColor: selected ? palette.red : "transparent",
                    borderRadius: 99,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      ...sans,
                      fontSize: 13,
                      fontFamily: selected ? fonts.sansSemiBold : fonts.sansMedium,
                      color: selected ? "#ffffff" : palette.muted,
                    }}
                  >
                    {category.name}
                  </Text>
                  <Text
                    style={{
                      ...sans,
                      fontSize: 11,
                      fontFamily: fonts.sansBold,
                      color: selected ? "rgba(255,255,255,0.85)" : "rgba(160, 112, 96, 0.6)",
                    }}
                  >
                    {count}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              minWidth: 240,
              maxWidth: 360,
              flexGrow: 1,
              backgroundColor: palette.card,
              borderWidth: 1,
              borderColor: palette.controlBorder,
              borderRadius: 99,
              paddingLeft: 14,
              paddingRight: 5,
              paddingVertical: 4,
            }}
          >
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search menu items..."
              placeholderTextColor={palette.placeholder}
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
                backgroundColor: palette.red,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="search" size={15} color="#ffffff" />
            </View>
          </View>
        </View>

        {menuItemsQuery.isLoading ? (
          <Text style={{ ...sans, padding: 24, color: palette.muted }}>Loading menu items...</Text>
        ) : null}
        {menuItemsQuery.isError ? (
          <View style={{ padding: 24, gap: 8 }}>
            <Text style={{ ...sans, color: palette.down }}>
              Failed to load menu items: {errorMessage(menuItemsQuery.error)}
            </Text>
            <Pressable onPress={() => void menuItemsQuery.refetch()}>
              <Text style={{ ...sans, color: palette.red, fontFamily: fonts.sansSemiBold }}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}
        {!menuItemsQuery.isLoading && filteredItems.length === 0 ? (
          <Text style={{ ...sans, padding: 24, color: palette.muted }}>No menu items</Text>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 16,
            padding: 20,
          }}
        >
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              isDeleting={
                deleteMenuItem.isPending && deleteMenuItem.variables?.id === item.id
              }
              onEdit={() => startEdit(item)}
              onDelete={() => deleteMenuItem.mutate({ id: item.id })}
            />
          ))}
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 8,
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: palette.hairline,
          }}
        >
          <Text style={{ ...sans, fontSize: 12, color: palette.dim }}>
            Showing {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "item" : "items"}
            {activeCategory ? ` in ${activeCategory.name}` : ""}
          </Text>
          <Text style={{ ...sans, fontSize: 12, color: palette.dim }}>
            {availableCount} of {menuItems.length} items available
          </Text>
        </View>
      </Panel>
    </ScrollView>
    <ConfirmDialog
      visible={dialog !== null}
      title={dialog?.title ?? ""}
      message={dialog?.message ?? ""}
      onClose={() => setDialog(null)}
    />
    </>
  );
}

function Panel({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: palette.cardBorder,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }

  const next = [...items];
  const [removed] = next.splice(from, 1);

  if (!removed) {
    return items;
  }

  next.splice(to, 0, removed);
  return next;
}

function CategoryReorderList({
  categories,
  disabled,
  onReorder,
}: {
  categories: Category[];
  disabled?: boolean;
  onReorder: (next: Category[]) => void;
}) {
  const dragFrom = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <View>
      {categories.map((category, index) => {
        const row = (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 11,
              borderBottomWidth: index === categories.length - 1 ? 0 : 1,
              borderBottomColor: palette.hairline,
              backgroundColor: overIndex === index ? palette.tabTrack : "transparent",
              opacity: dragFrom.current === index ? 0.55 : 1,
            }}
          >
            <Text
              style={{
                width: 36,
                ...sans,
                fontSize: 12,
                fontFamily: fonts.sansBold,
                color: palette.red,
              }}
            >
              {index + 1}
            </Text>
            <Text style={{ flex: 1, ...sans, fontSize: 13, fontFamily: fonts.sansMedium }}>
              {category.name}
            </Text>
            <Ionicons name="menu-outline" size={20} color={palette.axis} />
          </View>
        );

        if (Platform.OS !== "web") {
          return <View key={category.id}>{row}</View>;
        }

        return createElement(
          "div",
          {
            key: category.id,
            draggable: !disabled,
            onDragStart: () => {
              dragFrom.current = index;
            },
            onDragOver: (event: { preventDefault: () => void }) => {
              event.preventDefault();
              if (overIndex !== index) {
                setOverIndex(index);
              }
            },
            onDragLeave: () => {
              setOverIndex((current) => (current === index ? null : current));
            },
            onDrop: (event: { preventDefault: () => void }) => {
              event.preventDefault();
              const from = dragFrom.current;
              dragFrom.current = null;
              setOverIndex(null);

              if (from === null || from === index || disabled) {
                return;
              }

              onReorder(moveItem(categories, from, index));
            },
            onDragEnd: () => {
              dragFrom.current = null;
              setOverIndex(null);
            },
            style: {
              cursor: disabled ? "default" : "grab",
            },
          },
          row,
        );
      })}
    </View>
  );
}

function ImageUploadField({
  uri,
  required,
  onChange,
}: {
  uri: string;
  required?: boolean;
  onChange: (uri: string) => void;
}) {
  const fileInputRef = useRef<{ click: () => void; files?: FileList | null } | null>(
    null,
  );

  function openPicker() {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
    }
  }

  return (
    <View style={{ width: 200, gap: 6 }}>
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
        Image
        {required ? (
          <Text style={{ color: palette.red, fontFamily: fonts.sansSemiBold }}> *</Text>
        ) : null}
      </Text>
      <Pressable
        onPress={openPicker}
        style={{
          width: 200,
          height: 200,
          borderRadius: 12,
          borderWidth: 1.5,
          borderStyle: "dashed",
          borderColor: palette.controlBorder,
          backgroundColor: palette.tabTrack,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: 200, height: 200 }} resizeMode="cover" />
        ) : (
          <View style={{ alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
            <Ionicons name="image-outline" size={28} color={palette.dim} />
            <Text
              style={{
                ...sans,
                fontSize: 12,
                fontFamily: fonts.sansMedium,
                color: palette.muted,
                textAlign: "center",
              }}
            >
              Upload image
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
          accept="image/*"
          style={{ display: "none" }}
          onChange={(event: { target: { files?: FileList | null } }) => {
            const file = event.target.files?.[0];
            if (!file) {
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

function Field({
  label,
  children,
  style,
  required,
}: {
  label: string;
  children: ReactNode;
  style?: object;
  required?: boolean;
}) {
  return (
    <View style={[{ gap: 6, width: "100%" }, style]}>
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

function ConfirmDialog({
  visible,
  title,
  message,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(26, 8, 0, 0.45)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: palette.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.cardBorder,
            paddingHorizontal: 24,
            paddingTop: 22,
            paddingBottom: 20,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            gap: 10,
          }}
        >
          <Text style={{ ...serif, fontSize: 22, lineHeight: 28 }}>{title}</Text>
          <Text style={{ ...sans, fontSize: 14, color: palette.muted, lineHeight: 21 }}>
            {message}
          </Text>
          <Pressable
            onPress={onClose}
            style={{
              marginTop: 10,
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
              Okay
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AvailabilitySwitch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 99,
        padding: 3,
        backgroundColor: value ? palette.red : "#e5e7eb",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: "#ffffff",
          alignSelf: value ? "flex-end" : "flex-start",
        }}
      />
    </Pressable>
  );
}

function MenuItemCard({
  item,
  isDeleting,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const available = item.stockQuantity !== 0;

  return (
    <View
      style={{
        width: 240,
        flexGrow: 1,
        maxWidth: 320,
        minWidth: 220,
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
      <View style={{ height: 148, backgroundColor: "#f5ede8", position: "relative" }}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: "100%", height: 148 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="restaurant-outline" size={28} color={palette.muted} />
          </View>
        )}
        <View
          style={{
            position: "absolute",
            right: 10,
            top: 10,
            backgroundColor: available ? palette.kitchen : "#9ca3af",
            borderRadius: 99,
            paddingHorizontal: 8,
            paddingVertical: 4,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: "#ffffff",
            }}
          />
          <Text style={{ ...sans, color: "#ffffff", fontSize: 10, fontFamily: fonts.sansSemiBold }}>
            {available ? "Available" : "Unavailable"}
          </Text>
        </View>
      </View>
      <View style={{ padding: 14, gap: 8 }}>
        <Text numberOfLines={1} style={{ ...serif, fontSize: 18 }}>
          {item.name}
        </Text>
        <Text numberOfLines={2} style={{ ...sans, fontSize: 12, color: palette.muted, minHeight: 36 }}>
          {item.description ?? "No description"}
        </Text>
        <Text style={{ ...sans, fontSize: 16, fontFamily: fonts.sansBold, color: palette.red }}>
          {formatMoney(item.price)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="layers-outline" size={14} color={palette.dim} />
          <Text style={{ ...sans, fontSize: 12, color: palette.dim }}>
            {item.stockQuantity === null ? "Unlimited" : `${item.stockQuantity} left`}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Pressable
            onPress={onEdit}
            style={{
              flex: 1,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: palette.controlBorder,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Ionicons name="pencil-outline" size={14} color={palette.ink} />
            <Text style={{ ...sans, fontSize: 12, fontFamily: fonts.sansSemiBold }}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={{
              flex: 1,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: palette.controlBorder,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Ionicons name="trash-outline" size={14} color={palette.red} />
            <Text style={{ ...sans, fontSize: 12, fontFamily: fonts.sansSemiBold, color: palette.red }}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
