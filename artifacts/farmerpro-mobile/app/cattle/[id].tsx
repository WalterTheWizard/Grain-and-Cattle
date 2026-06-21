import { Feather } from "@expo/vector-icons";
import {
  useGetCattle,
  useListWeights,
  useListHealthRecords,
  useUpdateCattle,
  useDeleteCattle,
  useUpdateCattleStatus,
  useAddWeight,
  useAddHealthRecord,
  getListCattleQueryKey,
  getListWeightsQueryKey,
  getListHealthRecordsQueryKey,
  getGetCattleQueryKey,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

function InfoField({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.muted, borderRadius: 8, padding: 10 }}>
      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title, count, onAdd }: { title: string; count?: number; onAdd?: () => void }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8 }}>
        {title} {count !== undefined ? `(${count})` : ""}
      </Text>
      {onAdd && (
        <Pressable onPress={onAdd} style={{ padding: 6, borderRadius: 6, backgroundColor: colors.primary + "15" }}>
          <Feather name="plus" size={14} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

export default function CattleDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const queryClient = useQueryClient();
  const { me } = useAuth();
  const isAdmin = me?.role !== "employee";
  const [tab, setTab] = useState<"overview" | "weights" | "health">("overview");
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  // Edit form
  const [editTag, setEditTag] = useState("");
  const [editName, setEditName] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBreed, setEditBreed] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Weight form
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split("T")[0]);
  const [weightNotes, setWeightNotes] = useState("");

  // Health form
  const [healthType, setHealthType] = useState("");
  const [healthDesc, setHealthDesc] = useState("");
  const [healthDate, setHealthDate] = useState(new Date().toISOString().split("T")[0]);
  const [healthNotes, setHealthNotes] = useState("");

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

  const updateCattle = useUpdateCattle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCattleQueryKey(numId) });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        setShowEditModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const deleteCattle = useDeleteCattle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      },
    },
  });

  const addWeight = useAddWeight({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWeightsQueryKey(numId) });
        setShowWeightModal(false);
        resetWeightForm();
      },
    },
  });

  const addHealth = useAddHealthRecord({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHealthRecordsQueryKey(numId) });
        setShowHealthModal(false);
        resetHealthForm();
      },
    },
  });

  function resetWeightForm() {
    setWeightValue("");
    setWeightUnit("lbs");
    setWeightDate(new Date().toISOString().split("T")[0]);
    setWeightNotes("");
  }

  function resetHealthForm() {
    setHealthType("");
    setHealthDesc("");
    setHealthDate(new Date().toISOString().split("T")[0]);
    setHealthNotes("");
  }

  function startEdit() {
    if (!cattle) return;
    setEditTag(cattle.tagNumber);
    setEditName(cattle.name ?? "");
    setEditGender(cattle.gender);
    setEditBreed(cattle.breed ?? "");
    setEditBirthDate(cattle.birthDate ?? "");
    setEditNotes(cattle.notes ?? "");
    setShowEditModal(true);
  }

  function saveEdit() {
    updateCattle.mutate({
      id: numId,
      data: {
        tagNumber: editTag,
        name: editName || null,
        gender: editGender,
        breed: editBreed || null,
        birthDate: editBirthDate || null,
        notes: editNotes || null,
      },
    });
  }

  async function handleStatusChange(newStatus: "active" | "sold" | "deceased") {
    if (cattle?.status === newStatus) {
      setShowStatusSheet(false);
      return;
    }
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

  function handleDelete() {
    Alert.alert(
      "Delete Cattle",
      `Permanently delete Tag #${cattle?.tagNumber}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCattle.mutate({ id: numId }),
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
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
          {cattle.birthDate && <Text style={[styles.age(colors)]}>{calcAge(cattle.birthDate)}</Text>}

          {isAdmin && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Pressable onPress={startEdit} style={[styles.actionBtn, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="edit-2" size={14} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
              </Pressable>
              <Pressable onPress={handleDelete} style={[styles.actionBtn, { backgroundColor: colors.destructive + "15" }]}>
                <Feather name="trash-2" size={14} color={colors.destructive} />
                <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Delete</Text>
              </Pressable>
            </View>
          )}

          {cattle.status === "active" && (
            <Pressable onPress={() => setShowStatusSheet(true)} style={[styles.statusBtn(colors)]} testID="btn-update-status">
              <Feather name="edit-2" size={14} color={colors.primary} />
              <Text style={styles.statusBtnText(colors)}>Update Status</Text>
            </Pressable>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 16 }}>
          {/* Overview Tab */}
          {tab === "overview" && (
            <>
              {/* Lineage */}
              <View>
                <SectionHeader title="Lineage" />
                <View style={[styles.card(colors), { gap: 12 }]}>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Mother</Text>
                    {cattle.motherTag ? (
                      <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.primary, marginTop: 2 }}>
                        Tag #{cattle.motherTag}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>—</Text>
                    )}
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Calves</Text>
                    {cattle.calves && cattle.calves.length > 0 ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                        {cattle.calves.map((calf) => (
                          <Pressable
                            key={calf.id}
                            onPress={() => router.push(`/cattle/${calf.id}`)}
                            style={{ backgroundColor: colors.primary + "10", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}
                          >
                            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.primary }}>
                              #{calf.tagNumber}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                        No calves recorded
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {cattle.notes && (
                <View>
                  <SectionHeader title="Notes" />
                  <View style={styles.card(colors)}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 }}>
                      {cattle.notes}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Tabs */}
          <View style={{ flexDirection: "row", backgroundColor: colors.muted, borderRadius: colors.radius, padding: 3 }}>
            <Pressable
              style={[styles.tabBtn(colors), tab === "overview" && styles.tabActive(colors)]}
              onPress={() => setTab("overview")}
            >
              <Text style={[styles.tabText(colors), tab === "overview" && { color: colors.primary }]}>Overview</Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn(colors), tab === "weights" && styles.tabActive(colors)]}
              onPress={() => setTab("weights")}
            >
              <Text style={[styles.tabText(colors), tab === "weights" && { color: colors.primary }]}>
                Weights ({weights.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn(colors), tab === "health" && styles.tabActive(colors)]}
              onPress={() => setTab("health")}
            >
              <Text style={[styles.tabText(colors), tab === "health" && { color: colors.primary }]}>
                Health ({healthRecords.length})
              </Text>
            </Pressable>
          </View>

          {tab === "weights" && (
            <View style={{ gap: 8 }}>
              {isAdmin && (
                <SectionHeader title="Weight History" count={weights.length} onAdd={() => setShowWeightModal(true)} />
              )}
              {weights.length === 0 ? (
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
              )}
            </View>
          )}

          {tab === "health" && (
            <View style={{ gap: 8 }}>
              {isAdmin && (
                <SectionHeader title="Health Records" count={healthRecords.length} onAdd={() => setShowHealthModal(true)} />
              )}
              {healthRecords.length === 0 ? (
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
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Status Sheet */}
      <Modal visible={showStatusSheet} transparent animationType="slide" onRequestClose={() => setShowStatusSheet(false)}>
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

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={() => setShowEditModal(false)}>
            <View style={[styles.sheet(colors), { paddingBottom: insets.bottom + 16, maxHeight: "90%" }]}>
              <Text style={styles.sheetTitle(colors)}>Edit Animal</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                      Tag Number *
                    </Text>
                    <TextInput style={styles.input(colors)} value={editTag} onChangeText={setEditTag} placeholder="Tag number" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                      Name
                    </Text>
                    <TextInput style={styles.input(colors)} value={editName} onChangeText={setEditName} placeholder="Optional name" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                      Gender *
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["female", "male", "bull", "steer"] as const).map((g) => (
                        <Pressable
                          key={g}
                          onPress={() => setEditGender(g)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: colors.radius,
                            backgroundColor: editGender === g ? colors.primary + "15" : colors.muted,
                            borderWidth: 1,
                            borderColor: editGender === g ? colors.primary : colors.border,
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: editGender === g ? colors.primary : colors.foreground, textTransform: "capitalize" }}>
                            {g}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                      Breed
                    </Text>
                    <TextInput style={styles.input(colors)} value={editBreed} onChangeText={setEditBreed} placeholder="Breed" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                      Birth Date
                    </Text>
                    <TextInput style={styles.input(colors)} value={editBirthDate} onChangeText={setEditBirthDate} placeholder="YYYY-MM-DD" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                      Notes
                    </Text>
                    <TextInput style={[styles.input(colors), { height: 80, textAlignVertical: "top" }]} value={editNotes} onChangeText={setEditNotes} placeholder="Notes" multiline />
                  </View>
                  <Pressable
                    onPress={saveEdit}
                    disabled={updateCattle.isPending || !editTag}
                    style={[styles.saveBtn(colors), (updateCattle.isPending || !editTag) && { opacity: 0.6 }]}
                  >
                    <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                      {updateCattle.isPending ? "Saving..." : "Save Changes"}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Weight Modal */}
      <Modal visible={showWeightModal} transparent animationType="slide" onRequestClose={() => setShowWeightModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={() => setShowWeightModal(false)}>
            <View style={[styles.sheet(colors), { paddingBottom: insets.bottom + 16 }]}>
              <Text style={styles.sheetTitle(colors)}>Add Weight Record</Text>
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                      Weight *
                    </Text>
                    <TextInput style={styles.input(colors)} value={weightValue} onChangeText={setWeightValue} placeholder="0" keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                      Unit
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["lbs", "kg"] as const).map((u) => (
                        <Pressable
                          key={u}
                          onPress={() => setWeightUnit(u)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: colors.radius,
                            backgroundColor: weightUnit === u ? colors.primary + "15" : colors.muted,
                            borderWidth: 1,
                            borderColor: weightUnit === u ? colors.primary : colors.border,
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: weightUnit === u ? colors.primary : colors.foreground }}>{u}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
                <View>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                    Date *
                  </Text>
                  <TextInput style={styles.input(colors)} value={weightDate} onChangeText={setWeightDate} placeholder="YYYY-MM-DD" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                    Notes
                  </Text>
                  <TextInput style={styles.input(colors)} value={weightNotes} onChangeText={setWeightNotes} placeholder="Optional" />
                </View>
                <Pressable
                  onPress={() =>
                    addWeight.mutate({
                      id: numId,
                      data: { weight: parseFloat(weightValue), unit: weightUnit, date: weightDate, notes: weightNotes || undefined },
                    })
                  }
                  disabled={addWeight.isPending || !weightValue}
                  style={[styles.saveBtn(colors), (addWeight.isPending || !weightValue) && { opacity: 0.6 }]}
                >
                  <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                    {addWeight.isPending ? "Saving..." : "Add Weight"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Health Modal */}
      <Modal visible={showHealthModal} transparent animationType="slide" onRequestClose={() => setShowHealthModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={() => setShowHealthModal(false)}>
            <View style={[styles.sheet(colors), { paddingBottom: insets.bottom + 16 }]}>
              <Text style={styles.sheetTitle(colors)}>Add Health Record</Text>
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                    Type *
                  </Text>
                  <TextInput style={styles.input(colors)} value={healthType} onChangeText={setHealthType} placeholder="e.g. Vaccination, Treatment" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                    Description
                  </Text>
                  <TextInput style={[styles.input(colors), { height: 60, textAlignVertical: "top" }]} value={healthDesc} onChangeText={setHealthDesc} placeholder="Details..." multiline />
                </View>
                <View>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                    Date *
                  </Text>
                  <TextInput style={styles.input(colors)} value={healthDate} onChangeText={setHealthDate} placeholder="YYYY-MM-DD" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>
                    Notes
                  </Text>
                  <TextInput style={styles.input(colors)} value={healthNotes} onChangeText={setHealthNotes} placeholder="Optional" />
                </View>
                <Pressable
                  onPress={() =>
                    addHealth.mutate({
                      id: numId,
                      data: { type: healthType, description: healthDesc || undefined, date: healthDate, notes: healthNotes || undefined },
                    })
                  }
                  disabled={addHealth.isPending || !healthType}
                  style={[styles.saveBtn(colors), (addHealth.isPending || !healthType) && { opacity: 0.6 }]}
                >
                  <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                    {addHealth.isPending ? "Saving..." : "Add Record"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = {
  hero: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ h: { alignItems: "center" as const, paddingHorizontal: 16, paddingBottom: 16 } }).h,
  animalIcon: StyleSheet.create({ a: { width: 80, height: 80, borderRadius: 40, alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 12 } }).a,
  tagNum: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.mutedForeground, letterSpacing: 0.5 } }).t,
  cattleName: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 24, fontFamily: "Inter_700Bold", color: c.foreground, marginTop: 4, letterSpacing: -0.5 } }).t,
  chip: StyleSheet.create({ c: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 } }).c,
  chipText: StyleSheet.create({ t: { fontSize: 12, fontFamily: "Inter_500Medium" } }).t,
  age: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 6 } }).t,
  actionBtn: StyleSheet.create({
    b: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  }).b,
  actionBtnText: StyleSheet.create({ t: { fontSize: 13, fontFamily: "Inter_500Medium" } }).t,
  statusBtn: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      b: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, backgroundColor: c.primary + "15", borderRadius: c.radius, paddingHorizontal: 16, paddingVertical: 8, marginTop: 12 },
    }).b,
  statusBtnText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.primary } }).t,
  tabBtn: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ b: { flex: 1, paddingVertical: 8, alignItems: "center" as const, borderRadius: c.radius - 2 } }).b,
  tabActive: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ a: { backgroundColor: c.card, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 } }).a,
  tabText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.mutedForeground } }).t,
  card: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      c: { backgroundColor: c.card, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, padding: 14 },
    }).c,
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
      o: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, padding: 14, borderRadius: c.radius },
    }).o,
  sheetOptionText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.foreground } }).t,
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
