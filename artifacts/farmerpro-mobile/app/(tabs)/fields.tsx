import { Feather } from "@expo/vector-icons";
import {
  useListFields,
  useCreateField,
  useUpdateField,
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

function FieldRow({
  item,
  onEdit,
  onDelete,
  isAdmin,
}: {
  item: Field;
  onEdit: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  const colors = useColors();
  const statusColor =
    item.status === "available"
      ? colors.primary
      : item.status === "occupied"
      ? "#F59E0B"
      : colors.mutedForeground;
  return (
    <View style={styles.row(colors)}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
        <Feather name="map-pin" size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowTitle(colors)}>{item.name}</Text>
        <Text style={styles.rowSub(colors)}>
          {item.area ? `${item.area} ac` : ""}
          {item.area && item.status ? " · " : ""}
          {item.status}
          {item.description ? ` · ${item.description}` : ""}
          {item.latitude != null && item.longitude != null
            ? ` · ${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
            : ""}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={[styles.statusTag, { backgroundColor: statusColor + "20" }]}>
          <Text style={[styles.statusTxt, { color: statusColor }]}>{item.status}</Text>
        </View>
        {isAdmin && (
          <>
            <Pressable onPress={onEdit} style={{ padding: 4 }}>
              <Feather name="edit-2" size={15} color={colors.mutedForeground} />
            </Pressable>
            <Pressable onPress={onDelete} style={{ padding: 4 }}>
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </Pressable>
          </>
        )}
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
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"available" | "occupied" | "resting">("available");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const { data: fields = [], isLoading, refetch, isFetching } = useListFields({
    query: { queryKey: getListFieldsQueryKey() },
  });

  const createField = useCreateField({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFieldsQueryKey() });
        setShowModal(false);
        resetForm();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const updateField = useUpdateField({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFieldsQueryKey() });
        setShowModal(false);
        setEditingId(null);
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
    setLat("");
    setLng("");
  }

  function openAddModal() {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  }

  function openEditModal(field: Field) {
    setEditingId(field.id);
    setName(field.name);
    setArea(field.area?.toString() ?? "");
    setDescription(field.description ?? "");
    setStatus((field.status as "available" | "occupied" | "resting") ?? "available");
    setLat(field.latitude?.toString() ?? "");
    setLng(field.longitude?.toString() ?? "");
    setShowModal(true);
  }

  function handleSubmit() {
    if (!name.trim()) {
      Alert.alert("Missing Field", "Field name is required.");
      return;
    }
    const data = {
      name: name.trim(),
      area: area ? parseFloat(area) : undefined,
      description: description.trim() || undefined,
      status,
      latitude: lat ? parseFloat(lat) : undefined,
      longitude: lng ? parseFloat(lng) : undefined,
    };
    if (editingId != null) {
      updateField.mutate({ id: editingId, data });
    } else {
      createField.mutate({ data });
    }
  }

  function handleDelete(id: number, fieldName: string) {
    Alert.alert("Delete Field", `Remove ${fieldName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteField.mutate({ id }) },
    ]);
  }

  const isPending = createField.isPending || updateField.isPending;

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
            onPress={openAddModal}
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
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
              Add Field
            </Text>
          </Pressable>
        )}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={styles.summaryChip(colors, colors.primary)}>
            <Text style={styles.chipNum(colors.primary)}>{fields.length}</Text>
            <Text style={styles.chipLabel(colors)}>Total</Text>
          </View>
          <View style={styles.summaryChip(colors, "#F59E0B")}>
            <Text style={styles.chipNum("#F59E0B")}>
              {fields.filter((f) => f.status === "occupied").length}
            </Text>
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
          <FieldRow
            item={item}
            isAdmin={isAdmin}
            onEdit={() => openEditModal(item)}
            onDelete={() => handleDelete(item.id, item.name)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
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
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                  }}
                >
                  No fields registered
                </Text>
              </>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowModal(false);
          setEditingId(null);
          resetForm();
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              setShowModal(false);
              setEditingId(null);
              resetForm();
            }}
          >
            <View style={[styles.sheet(colors), { paddingBottom: insets.bottom + 16 }]}>
              <Text style={styles.sheetTitle(colors)}>
                {editingId != null ? "Edit Field" : "Add Field / Pasture"}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={styles.label(colors)}>Name *</Text>
                    <TextInput
                      style={styles.input(colors)}
                      value={name}
                      onChangeText={setName}
                      placeholder="Field name"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                  <View>
                    <Text style={styles.label(colors)}>Area (acres)</Text>
                    <TextInput
                      style={styles.input(colors)}
                      value={area}
                      onChangeText={setArea}
                      placeholder="0.0"
                      keyboardType="numeric"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                  <View>
                    <Text style={styles.label(colors)}>Status</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["available", "occupied", "resting"] as const).map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => setStatus(s)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: colors.radius,
                            backgroundColor: status === s ? colors.primary + "15" : colors.muted,
                            borderWidth: 1,
                            borderColor: status === s ? colors.primary : colors.border,
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: "Inter_500Medium",
                              color: status === s ? colors.primary : colors.foreground,
                              textTransform: "capitalize",
                            }}
                          >
                            {s}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label(colors)}>Latitude</Text>
                      <TextInput
                        style={styles.input(colors)}
                        value={lat}
                        onChangeText={setLat}
                        placeholder="e.g. 39.5"
                        keyboardType="decimal-pad"
                        placeholderTextColor={colors.mutedForeground}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label(colors)}>Longitude</Text>
                      <TextInput
                        style={styles.input(colors)}
                        value={lng}
                        onChangeText={setLng}
                        placeholder="e.g. -98.3"
                        keyboardType="decimal-pad"
                        placeholderTextColor={colors.mutedForeground}
                      />
                    </View>
                  </View>
                  <View>
                    <Text style={styles.label(colors)}>Description</Text>
                    <TextInput
                      style={[styles.input(colors), { height: 60, textAlignVertical: "top" }]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Optional description"
                      placeholderTextColor={colors.mutedForeground}
                      multiline
                    />
                  </View>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={isPending || !name.trim()}
                    style={[styles.saveBtn(colors), (isPending || !name.trim()) && { opacity: 0.6 }]}
                  >
                    <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                      {isPending
                        ? "Saving..."
                        : editingId != null
                        ? "Save Changes"
                        : "Add Field"}
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
  iconCircle: StyleSheet.create({
    c: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  }).c,
  rowTitle: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.foreground } }).t,
  rowSub: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 2 },
    }).t,
  statusTag: StyleSheet.create({ t: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 } }).t,
  statusTxt: StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_600SemiBold" } }).t,
  summaryChip: (c: ReturnType<typeof useColors>, accent: string) =>
    StyleSheet.create({
      ch: {
        flex: 1,
        backgroundColor: c.card,
        borderRadius: c.radius,
        borderWidth: 1,
        borderColor: c.border,
        padding: 10,
        alignItems: "center" as const,
      },
    }).ch,
  chipNum: (accent: string) =>
    StyleSheet.create({ t: { fontSize: 20, fontFamily: "Inter_700Bold", color: accent } }).t,
  chipLabel: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 1 },
    }).t,
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
        gap: 4,
        maxHeight: "85%",
      },
    }).s,
  sheetTitle: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.foreground, marginBottom: 12 },
    }).t,
  label: (c: ReturnType<typeof useColors>) =>
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
