import { fonts, palette } from "@ody/shared";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

const TAB_ICONS: Record<
  string,
  ComponentProps<typeof Ionicons>["name"]
> = {
  index: "home-outline",
  orders: "receipt-outline",
  menu: "restaurant-outline",
  crm: "people-outline",
  settings: "settings-outline",
};

const TAB_LABELS: Record<string, string> = {
  index: "Home",
  orders: "Orders",
  menu: "Menu",
  crm: "Customers",
  settings: "Settings",
};

type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

function SideTabBar({ state, descriptors, navigation }: TabBarProps) {
  return (
    <View
      style={{
        width: 220,
        backgroundColor: palette.card,
        borderRightWidth: 1,
        borderRightColor: palette.sidebarBorder,
        justifyContent: "space-between",
      }}
    >
      <View style={{ paddingTop: 50 }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = TAB_LABELS[route.name] ?? route.name;
          const icon = TAB_ICONS[route.name] ?? "ellipse-outline";

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={
                descriptors[route.key]?.options.tabBarAccessibilityLabel ?? label
              }
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={{
                marginRight: 12,
                backgroundColor: focused ? palette.tabActiveBg : "transparent",
                borderTopRightRadius: 24,
                borderBottomRightRadius: 24,
                paddingVertical: 11,
                paddingHorizontal: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                position: "relative",
              }}
            >
              {focused ? (
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 4,
                    width: 3,
                    height: 36,
                    borderTopRightRadius: 4,
                    borderBottomRightRadius: 4,
                    backgroundColor: palette.red,
                  }}
                />
              ) : null}
              <Ionicons
                name={icon}
                size={22}
                color={focused ? palette.red : palette.tabInactive}
              />
              <Text
                style={{
                  fontFamily: focused ? fonts.sansSemiBold : fonts.sans,
                  fontSize: 14,
                  lineHeight: 21,
                  color: focused ? palette.red : palette.tabInactive,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View
        style={{
          display: "none",
          borderTopWidth: 1,
          borderTopColor: palette.sidebarBorder,
          paddingHorizontal: 20,
          paddingVertical: 16,
          alignItems: "flex-end",
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: palette.tabActiveBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={18} color={palette.red} />
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <SideTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: "left",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="menu" options={{ title: "Menu" }} />
      <Tabs.Screen name="crm" options={{ title: "Customers" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
