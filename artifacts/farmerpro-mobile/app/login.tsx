import { Feather } from "@expo/vector-icons";
import { useSSO, useSignIn, useAuth as useClerkAuth } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

type OwnerView = "form" | "verify";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loginAsEmployee, loginAsOwnerWithClerk } = useAuth();
  const { getToken } = useClerkAuth();
  useWarmUpBrowser();

  const [tab, setTab] = useState<"employee" | "owner">("employee");

  // Employee fields
  const [farmEmail, setFarmEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Owner fields
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerView, setOwnerView] = useState<OwnerView>("form");
  const [verifyCode, setVerifyCode] = useState("");

  const { startSSOFlow } = useSSO();
  const { signIn } = useSignIn();

  async function handleEmployeeLogin() {
    if (!farmEmail.trim() || !username.trim() || !password) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    try {
      await loginAsEmployee(farmEmail.trim(), username.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/dashboard");
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : "Invalid credentials.";
      Alert.alert("Login Failed", msg);
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignIn = useCallback(async () => {
    setOwnerLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await loginAsOwnerWithClerk(() => getToken());
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)/dashboard");
      }
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Sign In Failed", err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setOwnerLoading(false);
    }
  }, [startSSOFlow, loginAsOwnerWithClerk, getToken, router]);

  async function handleOwnerEmailLogin() {
    if (!ownerEmail.trim() || !ownerPassword) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    setOwnerLoading(true);
    try {
      const { error } = await signIn.password({
        emailAddress: ownerEmail.trim(),
        password: ownerPassword,
      });
      if (error) {
        Alert.alert("Sign In Failed", error.message ?? "Invalid credentials.");
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: async ({ session }) => {
            if (!session?.currentTask) {
              await loginAsOwnerWithClerk(() => getToken());
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace("/(tabs)/dashboard");
            }
          },
        });
      } else if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
        // Try email code factor
        const emailFactor = signIn.supportedSecondFactors?.find(
          (f: { strategy: string }) => f.strategy === "email_code"
        );
        if (emailFactor) {
          await signIn.mfa.sendEmailCode();
        }
        setOwnerView("verify");
      }
    } catch (err) {
      Alert.alert("Sign In Failed", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setOwnerLoading(false);
    }
  }

  async function handleOwnerVerify() {
    setOwnerLoading(true);
    try {
      await signIn.mfa.verifyEmailCode({ code: verifyCode });
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: async ({ session }) => {
            if (!session?.currentTask) {
              await loginAsOwnerWithClerk(() => getToken());
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace("/(tabs)/dashboard");
            }
          },
        });
      }
    } catch (err) {
      Alert.alert("Verification Failed", err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setOwnerLoading(false);
    }
  }

  const s = styles(colors);

  return (
    <View style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.logoRow}>
            <View style={s.logoBox}>
              <Feather name="activity" size={32} color="#fff" />
            </View>
            <Text style={s.appName}>FarmerPro</Text>
            <Text style={s.tagline}>Manage. Grow. Succeed.</Text>
          </View>

          <View style={s.tabBar}>
            <Pressable
              style={[s.tabBtn, tab === "employee" && s.tabBtnActive]}
              onPress={() => setTab("employee")}
            >
              <Text style={[s.tabBtnText, tab === "employee" && s.tabBtnTextActive]}>
                Employee
              </Text>
            </Pressable>
            <Pressable
              style={[s.tabBtn, tab === "owner" && s.tabBtnActive]}
              onPress={() => setTab("owner")}
            >
              <Text style={[s.tabBtnText, tab === "owner" && s.tabBtnTextActive]}>
                Farm Owner
              </Text>
            </Pressable>
          </View>

          {tab === "employee" ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Employee Sign In</Text>

              <Text style={s.fieldLabel}>Farm Email</Text>
              <TextInput
                style={s.input}
                placeholder="farm@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={farmEmail}
                onChangeText={setFarmEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />

              <Text style={s.fieldLabel}>Username</Text>
              <TextInput
                style={s.input}
                placeholder="username"
                placeholderTextColor={colors.mutedForeground}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={s.fieldLabel}>Password</Text>
              <View style={s.passwordRow}>
                <TextInput
                  style={s.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleEmployeeLogin}
                  returnKeyType="go"
                />
                <Pressable style={s.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>

              <Pressable
                style={[s.loginBtn, isLoading && s.loginBtnDisabled]}
                onPress={handleEmployeeLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <>
                    <Feather name="log-in" size={18} color={colors.primaryForeground} />
                    <Text style={s.loginBtnText}>Sign In</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.cardTitle}>Farm Owner Sign In</Text>

              <Pressable
                style={[s.googleBtn, ownerLoading && s.loginBtnDisabled]}
                onPress={handleGoogleSignIn}
                disabled={ownerLoading}
              >
                {ownerLoading && ownerView === "form" ? (
                  <ActivityIndicator color={colors.foreground} />
                ) : (
                  <Text style={s.googleBtnText}>🔴  Continue with Google</Text>
                )}
              </Pressable>

              <View style={s.divider}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>OR</Text>
                <View style={s.dividerLine} />
              </View>

              {ownerView === "verify" ? (
                <>
                  <Text style={s.fieldLabel}>Verification Code</Text>
                  <Text style={s.hintText}>
                    We sent a code to your email. Enter it below.
                  </Text>
                  <TextInput
                    style={s.input}
                    placeholder="6-digit code"
                    placeholderTextColor={colors.mutedForeground}
                    value={verifyCode}
                    onChangeText={setVerifyCode}
                    keyboardType="number-pad"
                    autoFocus
                  />
                  <Pressable
                    style={[s.loginBtn, ownerLoading && s.loginBtnDisabled]}
                    onPress={handleOwnerVerify}
                    disabled={ownerLoading}
                  >
                    {ownerLoading ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <Text style={s.loginBtnText}>Verify & Sign In</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={s.backBtn}
                    onPress={() => setOwnerView("form")}
                  >
                    <Text style={s.backBtnText}>← Back</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={s.fieldLabel}>Email Address</Text>
                  <TextInput
                    style={s.input}
                    placeholder="owner@farm.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={ownerEmail}
                    onChangeText={setOwnerEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />

                  <Text style={s.fieldLabel}>Password</Text>
                  <View style={s.passwordRow}>
                    <TextInput
                      style={s.passwordInput}
                      placeholder="••••••••"
                      placeholderTextColor={colors.mutedForeground}
                      value={ownerPassword}
                      onChangeText={setOwnerPassword}
                      secureTextEntry={!showOwnerPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onSubmitEditing={handleOwnerEmailLogin}
                      returnKeyType="go"
                    />
                    <Pressable
                      style={s.eyeBtn}
                      onPress={() => setShowOwnerPassword(!showOwnerPassword)}
                    >
                      <Feather
                        name={showOwnerPassword ? "eye-off" : "eye"}
                        size={18}
                        color={colors.mutedForeground}
                      />
                    </Pressable>
                  </View>

                  <Pressable
                    style={[s.loginBtn, ownerLoading && s.loginBtnDisabled]}
                    onPress={handleOwnerEmailLogin}
                    disabled={ownerLoading}
                  >
                    {ownerLoading ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <>
                        <Feather name="log-in" size={18} color={colors.primaryForeground} />
                        <Text style={s.loginBtnText}>Sign In</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingBottom: 32,
    },
    logoRow: { alignItems: "center", marginBottom: 28 },
    logoBox: {
      width: 72,
      height: 72,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    appName: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 4,
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      padding: 3,
      marginBottom: 16,
    },
    tabBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 9,
      borderRadius: colors.radius - 2,
    },
    tabBtnActive: {
      backgroundColor: colors.card,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    tabBtnText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    tabBtnTextActive: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 1.5,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 18,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    hintText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginBottom: 12,
    },
    input: {
      height: 48,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      marginBottom: 14,
    },
    passwordRow: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
    passwordInput: {
      flex: 1,
      height: 48,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 14,
      paddingRight: 48,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    eyeBtn: {
      position: "absolute",
      right: 14,
      height: 48,
      justifyContent: "center",
    },
    loginBtn: {
      height: 52,
      borderRadius: colors.radius,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    loginBtnDisabled: { opacity: 0.6 },
    loginBtnText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: "600",
      fontFamily: "Inter_600SemiBold",
    },
    googleBtn: {
      height: 52,
      borderRadius: colors.radius,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    googleBtnText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 16,
      gap: 12,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    backBtn: { alignItems: "center", marginTop: 12 },
    backBtnText: {
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
    },
  });
}
