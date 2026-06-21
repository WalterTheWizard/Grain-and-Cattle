import { Feather } from "@expo/vector-icons";
import {
  useGetCattle,
  useListWeights,
  useListHealthRecords,
  useUpdateCattleStatus,
  getListCattleQueryKey,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

function genderColor(gender: string) {
  const map: Record<string, string> = { female: "#EC4899", male: "#3B82F6", bull: "#F97316", steer: "#9CA3AF" };
  return map[gender] ?? "#9CA3AF";
}

function calcAge(birthDate: string | null | undefined): string {
  if (!birthDate) return "Age unknown";
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (30 * 24 * 60 * 60 * 1000));
  return months < 12 ? `${months} months old` : `${Math.floor(months / 12)} years old`;
}

export default function CattleDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"weights" | "health">("weights");
  const [showStatusSheet, setShowStatusSheet] = useState(false);

  const { data: cattle, isLoading } = useGetCattle(numId);
  const { data: weights = [] } = useListWeights(numId);
  const { data: healthRecords = [] } = useListHealthRecords(numId);

  const updateStatus = useUpdateCattleStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        setShowStatusSheet(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  async function handleStatusChange(newStatus: "active" | "sold" | "deceased") {
    if (cattle?.status === newStatus) { setShowStatusSheet(false); return; }
    Alert.alert(
      "Update Status",
      `Mark this animal as ${newStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: newStatus === "deceased" ? "destructive" : "default",
          onPress: () => updateStatus.mutate({ id: numId, data: { status: newStatus } }),
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!cattle) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Cattle not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero(colors), { paddingTop: Platform.OS === "web" ? 67 + 16 : 16 }]}>
          <View style={[styles.animalIcon, { backgroundColor: genderColor(cattle.gender) + "20" }]}>
            <Text style={{ fontSize: 32 }}>🐄</Text>
          </View>
          <Text style={styles.tagNum(colors)}>#{cattle.tagNumber}</Text>
          <Text style={styles.cattleName(colors)}>{cattle.name || `Tag #${cattle.tagNumber}`}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <View style={[styles.chip, { backgroundColor: genderColor(cattle.gender) + "20" }]}>
              <Text style={[styles.chipText, { color: genderColor(cattle.gender) }]}>{cattle.gender}</Text>
            </View>
            {cattle.breed && (
              <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>{cattle.breed}</Text>
              </View>
            )}
            <View style={[styles.chip, { backgroundColor: cattle.status === "active" ? colors.primary + "20" : colors.muted }]}>
              <Text style={[styles.chipText, { color: cattle.status === "active" ? colors.primary : colors.mutedForeground }]}>
                {cattle.status}
              </Text>
            </View>
          </View>
          {cattle.birthDate && (
            <Text style={[styles.age(colors)]}>{calcAge(cattle.birthDate)}</Text>
          )}

          {cattle.status === "active" && (
            <Pressable
              onPress={() => setShowStatusSheet(true)}
              style={[styles.statusBtn(colors)]}
              testID="btn-update-status"
            >
              <Feather name="edit-2" size={14} color={colors.primary} />
              <Text style={styles.statusBtnText(colors)}>Update Status</Text>
            </Pressable>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={{ flexDirection: "row", backgroundColor: colors.muted, borderRadius: colors.radius, padding: 3 }}>
            <Pressable
              style={[styles.tabBtn(colors), tab === "weights" && styles.tabActive(colors)]}
              onPress={() => setTab("weights")}
            >
              <Text style={[styles.tabText(colors), tab === "weights" && { color: colors.primary }]}>
                Weight History ({weights.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn(colors), tab === "health" && styles.tabActive(colors)]}
              onPress={() => setTab("health")}
            >
              <Text style={[styles.tabText(colors), tab === "health" && { color: colors.primary }]}>
                Health Records ({healthRecords.length})
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 12, gap: 8 }}>
            {tab === "weights" ? (
              weights.length === 0 ? (
                <View style={styles.empty(colors)}>
                  <Feather name="bar-chart-2" size={32} color={colors.border} />
                  <Text style={styles.emptyText(colors)}>No weight records</Text>
                </View>
              ) : (
                (weights as { id: number; weight: number; unit?: string; date: string; notes?: string | null }[]).map((w) => (
                  <View key={w.id} style={styles.record(colors)}>
                    <View style={[styles.recordIcon, { backgroundColor: colors.primary + "15" }]}>
                      <Feather name="bar-chart-2" size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordMain(colors)}>{w.weight} {w.unit ?? "lbs"}</Text>
                      <Text style={styles.recordSub(colors)}>{w.date}{w.notes ? ` · ${w.notes}` : ""}</Text>
                    </View>
                  </View>
                ))
              )
            ) : (
              healthRecords.length === 0 ? (
                <View style={styles.empty(colors)}>
                  <Feather name="heart" size={32} color={colors.border} />
                  <Text style={styles.emptyText(colors)}>No health records</Text>
                </View>
              ) : (
                (healthRecords as { id: number; type: string; date: string; description?: string | null; notes?: string | null }[]).map((h) => (
                  <View key={h.id} style={styles.record(colors)}>
                    <View style={[styles.recordIcon, { backgroundColor: "#22C55E15" }]}>
                      <Feather name="heart" size={16} color="#22C55E" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordMain(colors)}>{h.type}</Text>
                      <Text style={styles.recordSub(colors)}>{h.date}{h.description ? ` · ${h.description}` : ""}</Text>
                    </View>
                  </View>
                ))
              )
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showStatusSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusSheet(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowStatusSheet(false)}>
          <View style={[styles.sheet(colors), { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.sheetTitle(colors)}>Update Animal Status</Text>
            {(["active", "sold", "deceased"] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => handleStatusChange(s)}
                style={[styles.sheetOption(colors), cattle.status === s && { backgroundColor: colors.primary + "15" }]}
              >
                <Feather
                  name={s === "active" ? "check-circle" : s === "sold" ? "dollar-sign" : "x-circle"}
                  size={18}
                  color={s === "deceased" ? colors.destructive : cattle.status === s ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.sheetOptionText(colors), s === "deceased" && { color: colors.destructive }, cattle.status === s && { color: colors.primary }]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  {cattle.status === s ? " (current)" : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = {
  hero: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      h: { alignItems: "center" as const, paddingHorizontal: 16, paddingBottom: 16 },
    }).h,
  animalIcon: StyleSheet.create({ a: { width: 80, height: 80, borderRadius: 40, alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 12 } }).a,
  tagNum: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.mutedForeground, letterSpacing: 0.5 } }).t,
  cattleName: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 24, fontFamily: "Inter_700Bold", color: c.foreground, marginTop: 4, letterSpacing: -0.5 } }).t,
  chip: StyleSheet.create({ c: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 } }).c,
  chipText: StyleSheet.create({ t: { fontSize: 12, fontFamily: "Inter_500Medium" } }).t,
  age: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 6 } }).t,
  statusBtn: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      b: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
        backgroundColor: c.primary + "15",
        borderRadius: c.radius,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginTop: 12,
      },
    }).b,
  statusBtnText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.primary } }).t,
  tabBtn: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ b: { flex: 1, paddingVertical: 8, alignItems: "center" as const, borderRadius: c.radius - 2 } }).b,
  tabActive: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ a: { backgroundColor: c.card, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 } }).a,
  tabText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.mutedForeground } }).t,
  record: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      r: {
        backgroundColor: c.card,
        borderRadius: c.radius,
        borderWidth: 1,
        borderColor: c.border,
        padding: 12,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
      },
    }).r,
  recordIcon: StyleSheet.create({ i: { width: 34, height: 34, borderRadius: 8, alignItems: "center" as const, justifyContent: "center" as const } }).i,
  recordMain: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.foreground } }).t,
  recordSub: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 2 } }).t,
  empty: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ e: { alignItems: "center" as const, paddingVertical: 40, gap: 10 } }).e,
  emptyText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.mutedForeground } }).t,
  backdrop: StyleSheet.create({ b: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" as const } }).b,
  sheet: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      s: {
        backgroundColor: c.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        gap: 4,
      },
    }).s,
  sheetTitle: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.foreground, marginBottom: 12 } }).t,
  sheetOption: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      o: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
        padding: 14,
        borderRadius: c.radius,
      },
    }).o,
  sheetOptionText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.foreground } }).t,
};
