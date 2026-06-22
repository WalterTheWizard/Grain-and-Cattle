import { Feather } from "@expo/vector-icons";
import {
  useListEmployees,
  useCreateEmployee,
  useDeleteEmployee,
  useGetSettings,
  useUpdateSettings,
  useDeleteAccount,
  getListEmployeesQueryKey,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme, type ThemePreference } from "@/contexts/ThemeContext";
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
      <View
        style={[
          styles.menuIcon,
          { backgroundColor: (danger ? colors.destructive : colors.primary) + "15" },
        ]}
      >
        <Feather
          name={icon as "log-out"}
          size={18}
          color={danger ? colors.destructive : colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel(colors), danger && { color: colors.destructive }]}>
          {label}
        </Text>
        {subtitle ? <Text style={styles.menuSub(colors)}>{subtitle}</Text> : null}
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function EmployeeItem({
  emp,
  isAdmin,
  onDelete,
}: {
  emp: { id: number; fullName: string; username: string; role: string };
  isAdmin: boolean;
  onDelete: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.empRow(colors)}>
      <View style={[styles.empAvatar(colors)]}>
        <Text style={styles.empInitial(colors)}>
          {emp.fullName[0]?.toUpperCase() ?? "?"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.empName(colors)}>{emp.fullName}</Text>
        <Text style={styles.empRole(colors)}>
          {emp.username} · {emp.role}
        </Text>
      </View>
      {isAdmin && (
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            {
              padding: 8,
              borderRadius: 6,
              backgroundColor: colors.destructive + "15",
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="trash-2" size={14} color={colors.destructive} />
        </Pressable>
      )}
    </View>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] =
  [
    { value: "light", label: "Light", icon: "sun" },
    { value: "dark", label: "Dark", icon: "moon" },
    { value: "system", label: "System", icon: "monitor" },
  ];

export default function MoreScreen() {
  const colors = useColors();
  const { theme, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me, logout } = useAuth();
  const isAdmin = me?.role !== "employee";
  const isOwner = me?.role === "owner";
  const [showEmployees, setShowEmployees] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

  // Settings form
  const [farmName, setFarmName] = useState(me?.farmName ?? "");
  const [ownerName, setOwnerName] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  // Add Employee form
  const [empFullName, setEmpFullName] = useState("");
  const [empUsername, setEmpUsername] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empRole, setEmpRole] = useState<"employee" | "employer">("employee");
  const [empPosition, setEmpPosition] = useState("");
  const [empPhone, setEmpPhone] = useState("");

  const { data: employees = [] } = useListEmployees();
  const { data: settings } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const createEmployee = useCreateEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        setShowAddEmployeeModal(false);
        resetEmpForm();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: () => Alert.alert("Error", "Failed to add staff member."),
    },
  });

  const deleteEmployee = useDeleteEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
      },
    },
  });

  const deleteAccount = useDeleteAccount({
    mutation: {
      onSuccess: async () => {
        await logout();
        router.replace("/login");
      },
      onError: () => Alert.alert("Error", "Failed to delete account. Please try again."),
    },
  });

  useEffect(() => {
    if (settings) {
      setFarmName(settings.farmName);
      setOwnerName((settings as any).ownerName ?? "");
      setLocation((settings as any).location ?? "");
    }
  }, [settings]);

  function resetEmpForm() {
    setEmpFullName("");
    setEmpUsername("");
    setEmpPassword("");
    setEmpRole("employee");
    setEmpPosition("");
    setEmpPhone("");
  }

  async function handleSaveSettings() {
    if (!farmName.trim()) return;
    setSaving(true);
    try {
      await updateSettings.mutateAsync({
        data: {
          farmName: farmName.trim(),
          ownerName: ownerName.trim() || undefined,
          location: location.trim() || undefined,
        } as any,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSettings(false);
    } catch {
      Alert.alert("Error", "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  function handleAddEmployee() {
    if (!empFullName.trim() || !empUsername.trim() || !empPassword.trim()) {
      Alert.alert("Missing Fields", "Full name, username, and password are required.");
      return;
    }
    createEmployee.mutate({
      data: {
        fullName: empFullName.trim(),
        username: empUsername.trim(),
        password: empPassword.trim(),
        role: empRole,
        position: empPosition.trim() || undefined,
        phone: empPhone.trim() || undefined,
      },
    });
  }

  function handleDeleteEmployee(id: number, name: string) {
    Alert.alert("Remove Staff", `Remove ${name} from the farm?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteEmployee.mutate({ id }),
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Farm Account",
      "This will permanently delete your farm, all associated data, and your sign-in identity. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => deleteAccount.mutate(),
        },
      ]
    );
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
      {/* Profile card */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <View style={styles.profileCard(colors)}>
          <View style={styles.profileAvatar(colors)}>
            <Text style={styles.profileInitial(colors)}>
              {(me?.employeeName || me?.email || "?")[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName(colors)}>
              {me?.employeeName || me?.email}
            </Text>
            <Text style={styles.profileRole(colors)}>
              {me?.role} · {me?.farmName}
            </Text>
          </View>
        </View>
      </View>

      {/* Team */}
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

        {showEmployees && (
          <View style={[styles.menuGroup(colors), { marginTop: 8, overflow: "visible" }]}>
            {isAdmin && (
              <Pressable
                onPress={() => setShowAddEmployeeModal(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  padding: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  backgroundColor: colors.primary + "08",
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="plus" size={16} color="#fff" />
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_500Medium",
                    color: colors.primary,
                  }}
                >
                  Add Staff Member
                </Text>
              </Pressable>
            )}
            {employees.length === 0 ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                  }}
                >
                  No staff members yet
                </Text>
              </View>
            ) : (
              (employees as {
                id: number;
                fullName: string;
                username: string;
                role: string;
              }[]).map((emp) => (
                <EmployeeItem
                  key={emp.id}
                  emp={emp}
                  isAdmin={isAdmin}
                  onDelete={() => handleDeleteEmployee(emp.id, emp.fullName)}
                />
              ))
            )}
          </View>
        )}
      </View>

      {/* Settings */}
      <View style={{ paddingHorizontal: 16, gap: 2, marginTop: 20 }}>
        <Text style={styles.sectionLabel(colors)}>SETTINGS</Text>
        <View style={styles.menuGroup(colors)}>
          {isAdmin && (
            <MenuItem
              icon="settings"
              label="Farm Settings"
              subtitle="Edit farm name, owner, and location"
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

      {showSettings && isAdmin && (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <View style={styles.settingsCard(colors)}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: colors.foreground,
                marginBottom: 12,
              }}
            >
              Farm Settings
            </Text>
            <Text style={styles.settingsTitle(colors)}>Farm Name</Text>
            <TextInput
              style={[styles.settingsInput(colors), { marginBottom: 10 }]}
              value={farmName}
              onChangeText={setFarmName}
              placeholder="Farm name"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={styles.settingsTitle(colors)}>Owner Name</Text>
            <TextInput
              style={[styles.settingsInput(colors), { marginBottom: 10 }]}
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="Owner name"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={styles.settingsTitle(colors)}>Farm Location</Text>
            <TextInput
              style={[styles.settingsInput(colors), { marginBottom: 12 }]}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Texas, USA"
              placeholderTextColor={colors.mutedForeground}
            />
            <Pressable
              style={[styles.saveBtn(colors), saving && { opacity: 0.6 }]}
              onPress={handleSaveSettings}
              disabled={saving}
            >
              <Text style={styles.saveBtnText(colors)}>
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Appearance */}
      <View style={{ paddingHorizontal: 16, gap: 2, marginTop: 20 }}>
        <Text style={styles.sectionLabel(colors)}>APPEARANCE</Text>
        <View style={styles.menuGroup(colors)}>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt, idx) => {
              const selected = theme === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    setTheme(opt.value);
                  }}
                  style={[
                    styles.themeOption(colors, selected),
                    idx === 0 && styles.themeOptionFirst(colors),
                    idx === THEME_OPTIONS.length - 1 &&
                      styles.themeOptionLast(colors),
                  ]}
                >
                  <Feather
                    name={opt.icon as "sun"}
                    size={16}
                    color={
                      selected ? colors.primaryForeground : colors.mutedForeground
                    }
                  />
                  <Text style={styles.themeOptionLabel(colors, selected)}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Danger Zone — owner only */}
      {isOwner && (
        <View style={{ paddingHorizontal: 16, gap: 2, marginTop: 20 }}>
          <Text
            style={[
              styles.sectionLabel(colors),
              { color: colors.destructive },
            ]}
          >
            DANGER ZONE
          </Text>
          <View
            style={[
              styles.menuGroup(colors),
              { borderColor: colors.destructive + "40" },
            ]}
          >
            <Pressable
              onPress={handleDeleteAccount}
              disabled={deleteAccount.isPending}
              style={({ pressed }) => [
                styles.menuItem(colors),
                { borderBottomWidth: 0 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: colors.destructive + "15" },
                ]}
              >
                <Feather name="trash-2" size={18} color={colors.destructive} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.menuLabel(colors), { color: colors.destructive }]}
                >
                  {deleteAccount.isPending ? "Deleting..." : "Delete Farm Account"}
                </Text>
                <Text style={styles.menuSub(colors)}>
                  Permanently removes your farm and all data
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      )}

      {/* About */}
      <View
        style={{
          paddingHorizontal: 16,
          marginTop: 32,
          alignItems: "center",
          gap: 4,
        }}
      >
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.aboutLogo}
          resizeMode="contain"
        />
        <Text style={styles.aboutVersion(colors)}>Version 1.0.0</Text>
      </View>

      {/* Add Employee Modal */}
      <Modal
        visible={showAddEmployeeModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddEmployeeModal(false);
          resetEmpForm();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable
            style={empModalStyles.backdrop}
            onPress={() => {
              setShowAddEmployeeModal(false);
              resetEmpForm();
            }}
          >
            <View
              style={[
                empModalStyles.sheet(colors),
                { paddingBottom: insets.bottom + 16 },
              ]}
            >
              <Text style={empModalStyles.title(colors)}>Add Staff Member</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={empModalStyles.lbl(colors)}>Full Name *</Text>
                      <TextInput
                        style={empModalStyles.input(colors)}
                        value={empFullName}
                        onChangeText={setEmpFullName}
                        placeholder="John Doe"
                        placeholderTextColor={colors.mutedForeground}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={empModalStyles.lbl(colors)}>Username *</Text>
                      <TextInput
                        style={empModalStyles.input(colors)}
                        value={empUsername}
                        onChangeText={setEmpUsername}
                        placeholder="johndoe"
                        placeholderTextColor={colors.mutedForeground}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View>
                    <Text style={empModalStyles.lbl(colors)}>Password *</Text>
                    <TextInput
                      style={empModalStyles.input(colors)}
                      value={empPassword}
                      onChangeText={setEmpPassword}
                      placeholder="••••••••"
                      placeholderTextColor={colors.mutedForeground}
                      secureTextEntry
                    />
                  </View>
                  <View>
                    <Text style={empModalStyles.lbl(colors)}>Role</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["employee", "employer"] as const).map((r) => (
                        <Pressable
                          key={r}
                          onPress={() => setEmpRole(r)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: colors.radius,
                            backgroundColor:
                              empRole === r ? colors.primary + "15" : colors.muted,
                            borderWidth: 1,
                            borderColor:
                              empRole === r ? colors.primary : colors.border,
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: "Inter_500Medium",
                              color:
                                empRole === r ? colors.primary : colors.foreground,
                              textTransform: "capitalize",
                            }}
                          >
                            {r}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={empModalStyles.lbl(colors)}>Position</Text>
                      <TextInput
                        style={empModalStyles.input(colors)}
                        value={empPosition}
                        onChangeText={setEmpPosition}
                        placeholder="e.g. Ranch Hand"
                        placeholderTextColor={colors.mutedForeground}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={empModalStyles.lbl(colors)}>Phone</Text>
                      <TextInput
                        style={empModalStyles.input(colors)}
                        value={empPhone}
                        onChangeText={setEmpPhone}
                        placeholder="555-0100"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                  <Pressable
                    onPress={handleAddEmployee}
                    disabled={
                      createEmployee.isPending ||
                      !empFullName.trim() ||
                      !empUsername.trim() ||
                      !empPassword.trim()
                    }
                    style={[
                      empModalStyles.saveBtn(colors),
                      (createEmployee.isPending ||
                        !empFullName.trim() ||
                        !empUsername.trim() ||
                        !empPassword.trim()) && { opacity: 0.6 },
                    ]}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 15,
                      }}
                    >
                      {createEmployee.isPending ? "Adding..." : "Add Staff Member"}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
    StyleSheet.create({
      pa: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: c.primary,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
    }).pa,
  profileInitial: (_c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" } }).t,
  profileName: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: c.foreground },
    }).t,
  profileRole: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: {
        fontSize: 13,
        fontFamily: "Inter_400Regular",
        color: c.mutedForeground,
        marginTop: 2,
        textTransform: "capitalize" as const,
      },
    }).t,
  sectionLabel: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: {
        fontSize: 11,
        fontFamily: "Inter_600SemiBold",
        color: c.mutedForeground,
        letterSpacing: 0.8,
        marginBottom: 8,
      },
    }).t,
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
  menuIcon: StyleSheet.create({
    mi: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  }).mi,
  menuLabel: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.foreground },
    }).t,
  menuSub: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 1 },
    }).t,
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
    StyleSheet.create({
      ea: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: c.accent,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
    }).ea,
  empInitial: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.accentForeground },
    }).t,
  empName: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.foreground },
    }).t,
  empRole: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: {
        fontSize: 12,
        fontFamily: "Inter_400Regular",
        color: c.mutedForeground,
        marginTop: 1,
        textTransform: "capitalize" as const,
      },
    }).t,
  settingsCard: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      sc: {
        backgroundColor: c.card,
        borderRadius: c.radius,
        borderWidth: 1,
        borderColor: c.border,
        padding: 16,
        gap: 2,
      },
    }).sc,
  settingsTitle: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: { fontSize: 11, fontFamily: "Inter_500Medium", color: c.mutedForeground, marginBottom: 4, textTransform: "uppercase" as const },
    }).t,
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
  saveBtnText: (_c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 } }).t,
  aboutLogo: { width: 160, height: 160, marginBottom: 4 },
  aboutVersion: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 6 },
    }).t,
  themeRow: StyleSheet.create({ r: { flexDirection: "row" as const } }).r,
  themeOption: (c: ReturnType<typeof useColors>, selected: boolean) =>
    StyleSheet.create({
      o: {
        flex: 1,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 6,
        paddingVertical: 14,
        backgroundColor: selected ? c.primary : c.card,
        borderRightWidth: 1,
        borderRightColor: c.border,
      },
    }).o,
  themeOptionFirst: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      o: { borderTopLeftRadius: c.radius, borderBottomLeftRadius: c.radius },
    }).o,
  themeOptionLast: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      o: {
        borderRightWidth: 0,
        borderTopRightRadius: c.radius,
        borderBottomRightRadius: c.radius,
      },
    }).o,
  themeOptionLabel: (c: ReturnType<typeof useColors>, selected: boolean) =>
    StyleSheet.create({
      t: {
        fontSize: 13,
        fontFamily: "Inter_500Medium",
        color: selected ? c.primaryForeground : c.mutedForeground,
      },
    }).t,
};

const empModalStyles = {
  backdrop: StyleSheet.create({
    b: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" as const },
  }).b,
  sheet: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      s: {
        backgroundColor: c.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "80%",
      },
    }).s,
  title: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.foreground, marginBottom: 16 },
    }).t,
  lbl: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: {
        fontSize: 11,
        fontFamily: "Inter_500Medium",
        color: c.mutedForeground,
        marginBottom: 4,
        textTransform: "uppercase" as const,
      },
    }).t,
  input: (c: ReturnType<typeof useColors>) =>
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
        marginTop: 8,
      },
    }).b,
};
