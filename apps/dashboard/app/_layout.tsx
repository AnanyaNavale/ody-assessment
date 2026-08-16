import { AXIOS_INSTANCE } from "@ody/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

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
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="orders/[id]" />
        <Stack.Screen name="crm/[id]" />
      </Stack>
    </QueryClientProvider>
  );
}
