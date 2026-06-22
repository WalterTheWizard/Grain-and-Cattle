import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkLoaded, ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import * as WebBrowser from "expo-web-browser";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import React, { useEffect } from "react";
import { Alert, Text, View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import BrandedSplashScreen from "@/components/BrandedSplashScreen";

ExpoSplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

const isExpoGo =
  (Constants as any).executionEnvironment === "storeClient" ||
  (Constants as any).appOwnership === "expo";

async function checkForAppUpdate() {
  try {
    if (!Updates.isEnabled) return;
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) return;
    await Updates.fetchUpdateAsync();
    Alert.alert(
      "Update ready",
      "A new version has been downloaded. Restart now to apply it.",
      [
        { text: "Later", style: "cancel" },
        {
          text: "Restart",
          onPress: () => Updates.reloadAsync(),
        },
      ]
    );
  } catch {
    // Non-fatal — updates are best-effort
  }
}

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ExpoGoNotice() {
  return (
    <View style={expoGoStyles.container}>
      <Text style={expoGoStyles.icon}>🌾</Text>
      <Text style={expoGoStyles.title}>Use the FarmerPro App</Text>
      <Text style={expoGoStyles.body}>
        FarmerPro requires a custom development build or the published app to
        run correctly. Expo Go does not support all the native modules needed
        for sign-in.
      </Text>
      <Text style={expoGoStyles.hint}>
        Ask your farm owner or IT contact for the FarmerPro app download link.
      </Text>
    </View>
  );
}

const expoGoStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#fff",
  },
  icon: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#1a1a1a", marginBottom: 12, textAlign: "center" },
  body: { fontSize: 15, color: "#555", textAlign: "center", lineHeight: 22, marginBottom: 16 },
  hint: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20 },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      ExpoSplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    checkForAppUpdate();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  if (isExpoGo) {
    return (
      <SafeAreaProvider>
        <ExpoGoNotice />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <ErrorBoundary>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <ClerkLoaded>
              <QueryClientProvider client={queryClient}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <AuthProvider>
                      <AuthWrapper />
                    </AuthProvider>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </QueryClientProvider>
            </ClerkLoaded>
          </ClerkProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { resolvedScheme } = useTheme();
  return <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />;
}

function AuthWrapper() {
  const { isLoading } = useAuth();
  return (
    <>
      <BrandedSplashScreen visible={isLoading} />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="cattle" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
