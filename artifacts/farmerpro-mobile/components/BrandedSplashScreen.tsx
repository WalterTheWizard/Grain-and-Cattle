import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function SplashScreen({ visible }: { visible: boolean }) {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          opacity: fadeAnim,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <View style={styles.center}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.spinner}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
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
  center: {
    alignItems: "center",
  },
  logo: {
    width: 220,
    height: 220,
  },
  spinner: {
    marginTop: 16,
  },
});
