import { AXIOS_INSTANCE } from "@ody/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

function useHideWebFocusOutline() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const styleId = "ody-hide-focus-outline";
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      input:focus,
      input:focus-visible,
      textarea:focus,
      textarea:focus-visible,
      select:focus,
      select:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

AXIOS_INSTANCE.defaults.baseURL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";

export default function RootLayout() {
  useHideWebFocusOutline();
  /* eslint-disable @typescript-eslint/no-require-imports */
  const [fontsLoaded, fontError] = useFonts({
    "DMSans-Regular": require("../assets/fonts/DMSans-Regular.ttf"),
    "DMSans-Medium": require("../assets/fonts/DMSans-Medium.ttf"),
    "DMSans-SemiBold": require("../assets/fonts/DMSans-SemiBold.ttf"),
    "DMSans-Bold": require("../assets/fonts/DMSans-Bold.ttf"),
    "DMSerifDisplay-Regular": require("../assets/fonts/DMSerifDisplay-Regular.ttf"),
  });
  /* eslint-enable @typescript-eslint/no-require-imports */

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="orders/[id]" />
        <Stack.Screen name="crm/[id]" />
        <Stack.Screen name="design-system" />
      </Stack>
    </QueryClientProvider>
  );
}
