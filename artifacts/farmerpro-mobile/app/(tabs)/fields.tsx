import { Feather } from "@expo/vector-icons";
import {
  useListFields,
  useCreateField,
  useDeleteField,
  getListFieldsQueryKey,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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

interface Field {
  id: number;
  name: string;
  description?: string | null;
  area?: number | null;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
}

function FieldRow({ item, onDelete }: { item: Field; onDelete: () => void }) {
  const colors = useColors();
  const statusColor = item.status === "available" ? colors.primary : item.status === "occupied" ? "#F59E0B" : colors.mutedForeground;
  return (
    <View style={styles.row(colors)}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
        <Feather name="map-pin" size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowTitle(colors)}>{item.name}</Text>
        <Text style={styles.rowSub(colors)}>
          {item.area ? `${item.area} ac` : ""}{item.area && item.status ? " · " : ""}{item.status}
          {item.description ? ` · ${item.description}` : ""}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={[styles.statusTag, { backgroundColor: statusColor + "20" }]}>
          <Text style={[styles.statusTxt, { color: statusColor }]}>{item.status}</Text>
        </View>
        <Pressable onPress={onDelete} style={{ padding: 4 }}>
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </Pressable>
      </View>
    </View>
  );
}

export default function FieldsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { me } = useAuth();
  const isAdmin = me?.role !== "employee";
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"available" | "occupied" | "resting">("available");

  const { data: fields = [], isLoading, refetch, isFetching } = useListFields({
    query: { queryKey: getListFieldsQueryKey() },
  });

  const createField = useCreateField({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFieldsQueryKey() });
        setShowAddModal(false);
        resetForm();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const deleteField = useDeleteField({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFieldsQueryKey() }),
    },
  });

  function resetForm() {
    setName("");
    setArea("");
    setDescription("");
    setStatus("available");
  }

  function handleAdd() {
    if (!name.trim()) {
      Alert.alert("Missing Field", "Field name is required.");
      return;
    }
    createField.mutate({
      data: {
        name: name.trim(),
        area: area ? parseFloat(area) : undefined,
        description: description.trim() || undefined,
        status,
      },
    });
  }

  function handleDelete(id: number, fieldName: string) {
    Alert.alert("Delete Field", `Remove ${fieldName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteField.mutate({ id }) },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "web" ? 67 + 16 : 16,
          paddingBottom: 12,
          gap: 12,
        }}
      >
        {isAdmin && (
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: colors.primary,
              height: 44,
              borderRadius: colors.radius,
            }}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Add Field</Text>
          </Pressable>
        )}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={styles.summaryChip(colors, colors.primary)}>
            <Text style={styles.chipNum(colors.primary)}>{fields.length}</Text>
            <Text style={styles.chipLabel(colors)}>Total</Text>
          </View>
          <View style={styles.summaryChip(colors, "#F59E0B")}>
            <Text style={styles.chipNum("#F59E0B")}>{fields.filter((f) => f.status === "occupied").length}</Text>
            <Text style={styles.chipLabel(colors)}>Occupied</Text>
          </View>
          <View style={styles.summaryChip(colors, colors.mutedForeground)}>
            <Text style={styles.chipNum(colors.mutedForeground)}>
              {fields.filter((f) => f.area).reduce((sum, f) => sum + (f.area ?? 0), 0)}
            </Text>
            <Text style={styles.chipLabel(colors)}>Total Acres</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={fields as Field[]}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <FieldRow item={item} onDelete={() => handleDelete(item.id, item.name)} />
        )}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 100,
          gap: 8,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Feather name="map" size={40} color={colors.border} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
                  No fields registered
                </Text>
              </>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={() => setShowAddModal(false)}>
            <View style={[styles.sheet(colors), { paddingBottom: insets.bottom + 16 }]}>
              <Text style={styles.sheetTitle(colors)}>Add Field / Pasture</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Name *</Text>
                    <TextInput style={styles.input(colors)} value={name} onChangeText={setName} placeholder="Field name" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Area (acres)</Text>
                    <TextInput style={styles.input(colors)} value={area} onChangeText={setArea} placeholder="0.0" keyboardType="numeric" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Status</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["available", "occupied", "resting"] as const).map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => setStatus(s)}
                          style={{ flex: 1, paddingVertical: 10, borderRadius: colors.radius, backgroundColor: status === s ? colors.primary + "15" : colors.muted, borderWidth: 1, borderColor: status === s ? colors.primary : colors.border, alignItems: "center" }}
                        >
                          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: status === s ? colors.primary : colors.foreground, textTransform: "capitalize" }}>{s}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Description</Text>
                    <TextInput style={[styles.input(colors), { height: 60, textAlignVertical: "top" }]} value={description} onChangeText={setDescription} placeholder="Optional description" multiline />
                  </View>
                  <Pressable
                    onPress={handleAdd}
                    disabled={createField.isPending || !name.trim()}
                    style={[styles.saveBtn(colors), (createField.isPending || !name.trim()) && { opacity: 0.6 }]}
                  >
                    <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                      {createField.isPending ? "Saving..." : "Add Field"}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = {
  row: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      r: {
        backgroundColor: c.card,
        borderRadius: c.radius,
        borderWidth: 1,
        borderColor: c.border,
        padding: 14,
        flexDirection: "row" as const,
        alignItems: "center" as const,
      },
    }).r,
  iconCircle: StyleSheet.create({ c: { width: 36, height: 36, borderRadius: 10, alignItems: "center" as const, justifyContent: "center" as const } }).c,
  rowTitle: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.foreground } }).t,
  rowSub: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 2 } }).t,
  statusTag: StyleSheet.create({ t: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 } }).t,
  statusTxt: StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_600SemiBold" } }).t,
  summaryChip: (c: ReturnType<typeof useColors>, accent: string) =>
    StyleSheet.create({
      ch: { flex: 1, backgroundColor: c.card, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, padding: 10, alignItems: "center" as const },
    }).ch,
  chipNum: (accent: string) =>
    StyleSheet.create({ t: { fontSize: 20, fontFamily: "Inter_700Bold", color: accent } }).t,
  chipLabel: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 1 } }).t,
  backdrop: StyleSheet.create({ b: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" as const } }).b,
  sheet: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      s: { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 4, maxHeight: "85%" },
    }).s,
  sheetTitle: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.foreground, marginBottom: 12 } }).t,
  input: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      i: { height: 46, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, paddingHorizontal: 12, fontSize: 15, color: c.foreground, fontFamily: "Inter_400Regular" },
    }).i,
  saveBtn: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      b: { backgroundColor: c.primary, borderRadius: c.radius, height: 46, alignItems: "center" as const, justifyContent: "center" as const, marginTop: 8 },
    }).b,
};
