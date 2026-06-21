import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

const MIN_DISPLAY_MS = 1800;

export default function BrandedSplashScreen({ visible }: { visible: boolean }) {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible && minElapsed) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, minElapsed, fadeAnim]);

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}
      pointerEvents={visible || !minElapsed ? "auto" : "none"}
    >
      <Image
        source={require("../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator color={colors.primary} style={styles.spinner} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 260,
    height: 260,
  },
  spinner: {
    marginTop: 20,
  },
});
