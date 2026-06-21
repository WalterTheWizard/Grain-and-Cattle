import { Feather } from "@expo/vector-icons";
import { useListEmployees, useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
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

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem(colors), pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.menuIcon, { backgroundColor: (danger ? colors.destructive : colors.primary) + "15" }]}>
        <Feather name={icon as "log-out"} size={18} color={danger ? colors.destructive : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel(colors), danger && { color: colors.destructive }]}>{label}</Text>
        {subtitle ? <Text style={styles.menuSub(colors)}>{subtitle}</Text> : null}
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function EmployeeItem({ emp }: { emp: { id: number; fullName: string; username: string; role: string } }) {
  const colors = useColors();
  return (
    <View style={styles.empRow(colors)}>
      <View style={[styles.empAvatar(colors)]}>
        <Text style={styles.empInitial(colors)}>{emp.fullName[0]?.toUpperCase() ?? "?"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.empName(colors)}>{emp.fullName}</Text>
        <Text style={styles.empRole(colors)}>{emp.username} · {emp.role}</Text>
      </View>
    </View>
  );
}

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { me, logout } = useAuth();
  const [showEmployees, setShowEmployees] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [farmName, setFarmName] = useState(me?.farmName ?? "");
  const [saving, setSaving] = useState(false);

  const { data: employees = [] } = useListEmployees();
  const { data: settings } = useGetSettings();
  const updateSettings = useUpdateSettings();

  useEffect(() => {
    if (settings?.farmName) setFarmName(settings.farmName);
  }, [settings]);

  async function handleSaveSettings() {
    if (!farmName.trim()) return;
    setSaving(true);
    try {
      await updateSettings.mutateAsync({ data: { farmName: farmName.trim() } });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSettings(false);
    } catch {
      Alert.alert("Error", "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? 67 + 16 : 16,
        paddingBottom: insets.bottom + 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <View style={styles.profileCard(colors)}>
          <View style={styles.profileAvatar(colors)}>
            <Text style={styles.profileInitial(colors)}>
              {(me?.employeeName || me?.email || "?")[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName(colors)}>{me?.employeeName || me?.email}</Text>
            <Text style={styles.profileRole(colors)}>{me?.role} · {me?.farmName}</Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 2 }}>
        <Text style={styles.sectionLabel(colors)}>TEAM</Text>
        <View style={styles.menuGroup(colors)}>
          <MenuItem
            icon="users"
            label="Employees"
            subtitle={`${employees.length} team member${employees.length !== 1 ? "s" : ""}`}
            onPress={() => setShowEmployees(!showEmployees)}
          />
        </View>

        {showEmployees && employees.length > 0 && (
          <View style={[styles.menuGroup(colors), { marginTop: 8 }]}>
            {(employees as { id: number; fullName: string; username: string; role: string }[]).map((emp) => (
              <EmployeeItem key={emp.id} emp={emp} />
            ))}
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 16, gap: 2, marginTop: 20 }}>
        <Text style={styles.sectionLabel(colors)}>SETTINGS</Text>
        <View style={styles.menuGroup(colors)}>
          {(me?.role === "owner" || me?.role === "employer") && (
            <MenuItem
              icon="settings"
              label="Farm Settings"
              subtitle="Edit farm name and preferences"
              onPress={() => setShowSettings(!showSettings)}
            />
          )}
          <MenuItem
            icon="log-out"
            label="Sign Out"
            subtitle="End your current session"
            onPress={handleLogout}
            danger
          />
        </View>
      </View>

      {showSettings && (
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={styles.settingsCard(colors)}>
            <Text style={styles.settingsTitle(colors)}>Farm Name</Text>
            <TextInput
              style={styles.settingsInput(colors)}
              value={farmName}
              onChangeText={setFarmName}
              placeholder="Farm name"
              placeholderTextColor={colors.mutedForeground}
            />
            <Pressable
              style={[styles.saveBtn(colors), saving && { opacity: 0.6 }]}
              onPress={handleSaveSettings}
              disabled={saving}
            >
              <Text style={styles.saveBtnText(colors)}>{saving ? "Saving..." : "Save Changes"}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={{ paddingHorizontal: 16, marginTop: 32, alignItems: "center", gap: 4 }}>
        <View style={styles.aboutLogoBox(colors)}>
          <Feather name="activity" size={20} color="#fff" />
        </View>
        <Text style={styles.aboutAppName(colors)}>FarmerPro</Text>
        <Text style={styles.aboutTagline(colors)}>Manage. Grow. Succeed.</Text>
        <Text style={styles.aboutVersion(colors)}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = {
  profileCard: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      pc: {
        backgroundColor: c.card,
        borderRadius: c.radius * 1.5,
        padding: 16,
        borderWidth: 1,
        borderColor: c.border,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 14,
      },
    }).pc,
  profileAvatar: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ pa: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.primary, alignItems: "center" as const, justifyContent: "center" as const } }).pa,
  profileInitial: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" } }).t,
  profileName: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: c.foreground } }).t,
  profileRole: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 2, textTransform: "capitalize" as const } }).t,
  sectionLabel: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: c.mutedForeground, letterSpacing: 0.8, marginBottom: 8 } }).t,
  menuGroup: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      mg: {
        backgroundColor: c.card,
        borderRadius: c.radius,
        borderWidth: 1,
        borderColor: c.border,
        overflow: "hidden" as const,
      },
    }).mg,
  menuItem: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      mi: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        padding: 14,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      },
    }).mi,
  menuIcon: StyleSheet.create({ mi: { width: 36, height: 36, borderRadius: 8, alignItems: "center" as const, justifyContent: "center" as const } }).mi,
  menuLabel: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.foreground } }).t,
  menuSub: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 1 } }).t,
  empRow: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      r: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        padding: 14,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      },
    }).r,
  empAvatar: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ ea: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.accent, alignItems: "center" as const, justifyContent: "center" as const } }).ea,
  empInitial: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.accentForeground } }).t,
  empName: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.foreground } }).t,
  empRole: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 1, textTransform: "capitalize" as const } }).t,
  settingsCard: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      sc: {
        backgroundColor: c.card,
        borderRadius: c.radius,
        borderWidth: 1,
        borderColor: c.border,
        padding: 16,
        gap: 12,
      },
    }).sc,
  settingsTitle: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.mutedForeground } }).t,
  settingsInput: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      i: {
        height: 46,
        borderRadius: c.radius,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.background,
        paddingHorizontal: 12,
        fontSize: 15,
        color: c.foreground,
        fontFamily: "Inter_400Regular",
      },
    }).i,
  saveBtn: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      b: {
        backgroundColor: c.primary,
        borderRadius: c.radius,
        height: 46,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
    }).b,
  saveBtnText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 } }).t,
  aboutLogoBox: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ b: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.primary, alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 6 } }).b,
  aboutAppName: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.foreground } }).t,
  aboutTagline: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 2 } }).t,
  aboutVersion: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 6 } }).t,
};
