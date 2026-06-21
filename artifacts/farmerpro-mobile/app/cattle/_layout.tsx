import { Stack } from "expo-router";
import React from "react";
import { useColors } from "@/hooks/useColors";

export default function CattleLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="[id]" options={{ title: "Animal Detail" }} />
    </Stack>
  );
}
