import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();
  const { isAuthenticated, isLoading, me } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

  const farmType = me?.farmType ?? null;
  const showCattle = farmType === "cattle" || farmType === "both" || farmType === null;
  const showGrain = farmType === "grain" || farmType === "both" || farmType === null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
        headerShadowVisible: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cattle"
        options={{
          title: "Livestock",
          tabBarLabel: "Cattle",
          href: showCattle ? undefined : null,
          tabBarIcon: ({ color, size }) => <Feather name="box" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Farm Tasks",
          tabBarLabel: "Tasks",
          tabBarIcon: ({ color, size }) => <Feather name="clipboard" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fields"
        options={{
          title: "Fields",
          tabBarLabel: "Fields",
          tabBarIcon: ({ color, size }) => <Feather name="map-pin" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="grain"
        options={{
          title: "Grain",
          tabBarLabel: "Grain",
          href: showGrain ? undefined : null,
          tabBarIcon: ({ color, size }) => <Feather name="sun" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="timecards"
        options={{
          title: "Time Cards",
          tabBarLabel: "Time",
          tabBarIcon: ({ color, size }) => <Feather name="clock" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarLabel: "More",
          tabBarIcon: ({ color, size }) => <Feather name="menu" size={size - 2} color={color} />,
        }}
      />
    </Tabs>
  );
}
