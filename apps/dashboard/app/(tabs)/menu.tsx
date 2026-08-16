import {
  getGetMenuItemsQueryKey,
  useCreateMenuItem,
  useDeleteMenuItem,
  useGetCategories,
  useGetMenuItems,
  useUpdateMenuItem,
  type MenuItem,
} from "@ody/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

type ItemFormState = {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  isAvailable: boolean;
  stockQuantity: string;
};

const emptyForm: ItemFormState = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  isAvailable: true,
  stockQuantity: "",
};

function notify(message: string) {
  console.log(message);
  alert(message);
}

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

function formFromItem(item: MenuItem): ItemFormState {
  return {
    name: item.name,
    description: item.description ?? "",
    price: item.price,
    categoryId: item.categoryId,
    isAvailable: item.isAvailable,
    stockQuantity: item.stockQuantity === null ? "" : String(item.stockQuantity),
  };
}

function validateForm(form: ItemFormState): string | null {
  if (form.name.trim().length === 0) {
    return "Name is required";
  }

  if (form.price.trim().length === 0) {
    return "Price is required";
  }

  if (Number.isNaN(Number(form.price))) {
    return "Price must be a number";
  }

  if (form.categoryId.length === 0) {
    return "Category is required";
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
  return {
    name: form.name.trim(),
    description: form.description.trim() === "" ? null : form.description.trim(),
    price: form.price.trim(),
    categoryId: form.categoryId,
    isAvailable: form.isAvailable,
    stockQuantity:
      form.stockQuantity.trim() === "" ? null : Number(form.stockQuantity),
  };
}

export default function MenuScreen() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ItemFormState>(emptyForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const categoriesQuery = useGetCategories();
  const menuItemsQuery = useGetMenuItems();

  const invalidateMenuItems = () =>
    queryClient.invalidateQueries({ queryKey: getGetMenuItemsQueryKey() });

  const createMenuItem = useCreateMenuItem({
    mutation: {
      onSuccess: async () => {
        await invalidateMenuItems();
        setForm(emptyForm);
        notify("Menu item created");
      },
      onError: (error) => {
        notify(`Create failed: ${errorMessage(error)}`);
      },
    },
  });

  const updateMenuItem = useUpdateMenuItem({
    mutation: {
      onSuccess: async () => {
        await invalidateMenuItems();
        setEditingItemId(null);
        setForm(emptyForm);
        notify("Menu item updated");
      },
      onError: (error) => {
        notify(`Update failed: ${errorMessage(error)}`);
      },
    },
  });

  const deleteMenuItem = useDeleteMenuItem({
    mutation: {
      onSuccess: async () => {
        await invalidateMenuItems();
        notify("Menu item deleted");
      },
      onError: (error) => {
        notify(`Delete failed: ${errorMessage(error)}`);
      },
    },
  });

  const categories = categoriesQuery.data ?? [];
  const menuItems = menuItemsQuery.data ?? [];

  function submitForm() {
    const validationError = validateForm(form);

    if (validationError) {
      notify(validationError);
      return;
    }

    const data = toPayload(form);

    if (editingItemId) {
      updateMenuItem.mutate({ id: editingItemId, data });
      return;
    }

    createMenuItem.mutate({ data });
  }

  function startEdit(item: MenuItem) {
    setEditingItemId(item.id);
    setForm(formFromItem(item));
  }

  function cancelEdit() {
    setEditingItemId(null);
    setForm(emptyForm);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontWeight: "bold", marginBottom: 12 }}>Menu</Text>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontWeight: "bold", marginBottom: 8 }}>Categories</Text>
        {categoriesQuery.isLoading ? <Text>Loading categories...</Text> : null}
        {categoriesQuery.isError ? (
          <View>
            <Text>
              Failed to load categories: {errorMessage(categoriesQuery.error)}
            </Text>
            <Pressable
              onPress={() => void categoriesQuery.refetch()}
              style={{
                backgroundColor: "#6b7280",
                paddingVertical: 8,
                paddingHorizontal: 12,
                alignSelf: "flex-start",
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#ffffff" }}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {!categoriesQuery.isLoading &&
        !categoriesQuery.isError &&
        categories.length === 0 ? (
          <Text>No categories yet</Text>
        ) : null}
        {categories.map((category) => (
          <Text key={category.id} style={{ marginBottom: 4 }}>
            {category.name} (displayOrder: {category.displayOrder})
          </Text>
        ))}
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: "#d1d5db",
          padding: 16,
          marginBottom: 24,
        }}
      >
        <Text style={{ fontWeight: "bold", marginBottom: 12 }}>
          {editingItemId ? "Edit menu item" : "Create menu item"}
        </Text>
        <Text>Name</Text>
        <TextInput
          value={form.name}
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          style={{ borderWidth: 1, borderColor: "#d1d5db", padding: 8, marginBottom: 8 }}
        />
        <Text>Description</Text>
        <TextInput
          value={form.description}
          onChangeText={(description) =>
            setForm((current) => ({ ...current, description }))
          }
          style={{ borderWidth: 1, borderColor: "#d1d5db", padding: 8, marginBottom: 8 }}
        />
        <Text>Price</Text>
        <TextInput
          value={form.price}
          onChangeText={(price) => setForm((current) => ({ ...current, price }))}
          keyboardType="decimal-pad"
          style={{ borderWidth: 1, borderColor: "#d1d5db", padding: 8, marginBottom: 8 }}
        />
        <Text>Category</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() =>
                setForm((current) => ({ ...current, categoryId: category.id }))
              }
              style={{
                backgroundColor:
                  form.categoryId === category.id ? "#1d4ed8" : "#e5e7eb",
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <Text
                style={{
                  color: form.categoryId === category.id ? "#ffffff" : "#111827",
                }}
              >
                {category.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text>Available</Text>
        <Switch
          value={form.isAvailable}
          onValueChange={(isAvailable) =>
            setForm((current) => ({ ...current, isAvailable }))
          }
        />
        <Text>Stock quantity (empty = unlimited)</Text>
        <TextInput
          value={form.stockQuantity}
          onChangeText={(stockQuantity) =>
            setForm((current) => ({ ...current, stockQuantity }))
          }
          keyboardType="number-pad"
          style={{ borderWidth: 1, borderColor: "#d1d5db", padding: 8, marginBottom: 12 }}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={submitForm}
            style={{
              backgroundColor: "#2563eb",
              paddingVertical: 10,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: "#ffffff" }}>
              {createMenuItem.isPending || updateMenuItem.isPending
                ? "Saving..."
                : editingItemId
                  ? "Save changes"
                  : "Create menu item"}
            </Text>
          </Pressable>
          {editingItemId ? (
            <Pressable
              onPress={cancelEdit}
              style={{
                backgroundColor: "#6b7280",
                paddingVertical: 10,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ color: "#ffffff" }}>Cancel edit</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View>
        <Text style={{ fontWeight: "bold", marginBottom: 12 }}>Menu items</Text>
        {menuItemsQuery.isLoading ? <Text>Loading menu items...</Text> : null}
        {menuItemsQuery.isError ? (
          <View>
            <Text>
              Failed to load menu items: {errorMessage(menuItemsQuery.error)}
            </Text>
            <Pressable
              onPress={() => void menuItemsQuery.refetch()}
              style={{
                backgroundColor: "#6b7280",
                paddingVertical: 8,
                paddingHorizontal: 12,
                alignSelf: "flex-start",
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#ffffff" }}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {!menuItemsQuery.isLoading &&
        !menuItemsQuery.isError &&
        menuItems.length === 0 ? (
          <Text>No menu items yet</Text>
        ) : null}
        {categories.map((category) => {
          const items = menuItems.filter((item) => item.categoryId === category.id);

          if (items.length === 0) {
            return null;
          }

          return (
            <View key={category.id} style={{ marginBottom: 24 }}>
              <Text style={{ fontWeight: "bold", marginBottom: 8 }}>
                {category.name}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                {items.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    categoryName={category.name}
                    isDeleting={
                      deleteMenuItem.isPending &&
                      deleteMenuItem.variables?.id === item.id
                    }
                    onEdit={() => startEdit(item)}
                    onDelete={() => deleteMenuItem.mutate({ id: item.id })}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function MenuItemRow({
  item,
  categoryName,
  isDeleting,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  categoryName: string;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#d1d5db",
        padding: 12,
        width: "31%",
        minWidth: 220,
        flexGrow: 1,
        maxWidth: 420,
      }}
    >
      <Text>name: {item.name}</Text>
      <Text>description: {item.description ?? "(none)"}</Text>
      <Text>price: {item.price}</Text>
      <Text>category: {categoryName}</Text>
      <Text>isAvailable: {String(item.isAvailable)}</Text>
      <Text>
        stockQuantity:{" "}
        {item.stockQuantity === null ? "unlimited" : String(item.stockQuantity)}
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Pressable
          onPress={onEdit}
          style={{
            backgroundColor: "#6b7280",
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: "#ffffff" }}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={{
            backgroundColor: "#dc2626",
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: "#ffffff" }}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
