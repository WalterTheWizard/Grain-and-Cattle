import { Feather } from "@expo/vector-icons";
import {
  useListCattle,
  useUpdateCattleStatus,
  useCreateCattle,
  getListCattleQueryKey,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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

function genderColor(gender: string, colors: ReturnType<typeof useColors>) {
  const map: Record<string, string> = {
    female: "#EC4899",
    male: "#3B82F6",
    bull: "#F97316",
    steer: colors.mutedForeground,
  };
  return map[gender] ?? colors.mutedForeground;
}

function calcAge(birthDate: string | null | undefined): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  const months = Math.floor((now.getTime() - birth.getTime()) / (30 * 24 * 60 * 60 * 1000));
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}yr`;
}

interface CattleItem {
  id: number;
  tagNumber: string;
  name?: string | null;
  gender: string;
  breed?: string | null;
  birthDate?: string | null;
  status: string;
}

function CattleRow({ item, onPress }: { item: CattleItem; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row(colors), pressed && { opacity: 0.7 }]}>
      <View style={[styles.tagBox(colors)]}>
        <Text style={styles.tagNum(colors)}>#{item.tagNumber}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.cattleName(colors)} numberOfLines={1}>
          {item.name || `Tag #${item.tagNumber}`}
        </Text>
        <Text style={[styles.breed(colors)]}>
          {item.breed ? `${item.breed} · ` : ""}{item.gender}{item.birthDate ? ` · ${calcAge(item.birthDate)}` : ""}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <View style={[styles.statusBadge, { backgroundColor: item.status === "active" ? colors.primary + "20" : colors.muted }]}>
          <Text style={[styles.statusText, { color: item.status === "active" ? colors.primary : colors.mutedForeground }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.genderDot, { backgroundColor: genderColor(item.gender, colors) + "30" }]}>
          <Text style={[styles.genderText, { color: genderColor(item.gender, colors) }]}>
            {item.gender}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
    </Pressable>
  );
}

export default function CattleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me } = useAuth();
  const isAdmin = me?.role !== "employee";
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Add form
  const [addTag, setAddTag] = useState("");
  const [addName, setAddName] = useState("");
  const [addGender, setAddGender] = useState("");
  const [addBreed, setAddBreed] = useState("");
  const [addBirthDate, setAddBirthDate] = useState("");
  const [addNotes, setAddNotes] = useState("");

  const { data: activeCattle = [], isLoading, refetch, isFetching } = useListCattle(
    { status: "active" },
    { query: { queryKey: getListCattleQueryKey({ status: "active" }) } }
  );

  const { data: allCattle = [], isLoading: isLoadingAll } = useListCattle(
    {},
    { query: { queryKey: getListCattleQueryKey({}) } }
  );

  const createCattle = useCreateCattle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        setShowAddModal(false);
        resetAddForm();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  function resetAddForm() {
    setAddTag("");
    setAddName("");
    setAddGender("");
    setAddBreed("");
    setAddBirthDate("");
    setAddNotes("");
  }

  function handleAdd() {
    if (!addTag.trim() || !addGender) {
      Alert.alert("Missing Fields", "Tag number and gender are required.");
      return;
    }
    createCattle.mutate({
      data: {
        tagNumber: addTag.trim(),
        name: addName.trim() || undefined,
        gender: addGender as "female" | "male" | "bull" | "steer",
        breed: addBreed.trim() || undefined,
        birthDate: addBirthDate || undefined,
        notes: addNotes.trim() || undefined,
      },
    });
  }

  const filtered = (search
    ? allCattle.filter(
        (c) =>
          c.tagNumber.toLowerCase().includes(search.toLowerCase()) ||
          (c.name && c.name.toLowerCase().includes(search.toLowerCase()))
      )
    : activeCattle) as CattleItem[];

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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[styles.searchBox(colors), { flex: 1 }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={styles.searchInput(colors)}
              placeholder="Search by tag or name..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
              testID="input-search"
            />
            {search ? (
              <Pressable onPress={() => setSearch("")}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
          {isAdmin && (
            <Pressable onPress={() => setShowAddModal(true)} style={{ width: 44, height: 44, borderRadius: colors.radius, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <Feather name="plus" size={20} color="#fff" />
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={styles.summaryChip(colors, colors.primary)}>
            <Text style={styles.chipNum(colors.primary)}>{activeCattle.length}</Text>
            <Text style={styles.chipLabel(colors)}>Active</Text>
          </View>
          <View style={styles.summaryChip(colors, colors.mutedForeground)}>
            <Text style={styles.chipNum(colors.mutedForeground)}>{allCattle.filter(c => c.status === "sold").length}</Text>
            <Text style={styles.chipLabel(colors)}>Sold</Text>
          </View>
          <View style={styles.summaryChip(colors, colors.mutedForeground)}>
            <Text style={styles.chipNum(colors.mutedForeground)}>{allCattle.filter(c => c.status === "deceased").length}</Text>
            <Text style={styles.chipLabel(colors)}>Deceased</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CattleRow item={item} onPress={() => router.push(`/cattle/${item.id}`)} />
        )}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
            {isLoading || isLoadingAll ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Feather name="box" size={40} color={colors.border} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
                  {search ? "No cattle match your search" : "No cattle registered"}
                </Text>
              </>
            )}
          </View>
        }
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={() => setShowAddModal(false)}>
            <View style={[styles.sheet(colors), { paddingBottom: insets.bottom + 16 }]}>
              <Text style={styles.sheetTitle(colors)}>Register New Cattle</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Tag Number *</Text>
                    <TextInput style={styles.input(colors)} value={addTag} onChangeText={setAddTag} placeholder="Tag number" autoCapitalize="none" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Name</Text>
                    <TextInput style={styles.input(colors)} value={addName} onChangeText={setAddName} placeholder="Optional name" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Gender *</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["female", "male", "bull", "steer"] as const).map((g) => (
                        <Pressable
                          key={g}
                          onPress={() => setAddGender(g)}
                          style={{ flex: 1, paddingVertical: 10, borderRadius: colors.radius, backgroundColor: addGender === g ? colors.primary + "15" : colors.muted, borderWidth: 1, borderColor: addGender === g ? colors.primary : colors.border, alignItems: "center" }}
                        >
                          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: addGender === g ? colors.primary : colors.foreground, textTransform: "capitalize" }}>{g}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Breed</Text>
                    <TextInput style={styles.input(colors)} value={addBreed} onChangeText={setAddBreed} placeholder="Breed" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Birth Date</Text>
                    <TextInput style={styles.input(colors)} value={addBirthDate} onChangeText={setAddBirthDate} placeholder="YYYY-MM-DD" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Notes</Text>
                    <TextInput style={[styles.input(colors), { height: 80, textAlignVertical: "top" }]} value={addNotes} onChangeText={setAddNotes} placeholder="Notes" multiline />
                  </View>
                  <Pressable
                    onPress={handleAdd}
                    disabled={createCattle.isPending || !addTag || !addGender}
                    style={[styles.saveBtn(colors), (createCattle.isPending || !addTag || !addGender) && { opacity: 0.6 }]}
                  >
                    <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                      {createCattle.isPending ? "Saving..." : "Register Cattle"}
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
      r: { flexDirection: "row" as const, alignItems: "center" as const, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card },
    }).r,
  tagBox: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ b: { backgroundColor: c.muted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 } }).b,
  tagNum: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: c.foreground } }).t,
  cattleName: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontFamily: "Inter_500Medium", fontSize: 15, color: c.foreground } }).t,
  breed: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontFamily: "Inter_400Regular", fontSize: 12, color: c.mutedForeground, marginTop: 2 } }).t,
  statusBadge: StyleSheet.create({ b: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 } }).b,
  statusText: StyleSheet.create({ t: { fontFamily: "Inter_600SemiBold", fontSize: 10 } }).t,
  genderDot: StyleSheet.create({ d: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 } }).d,
  genderText: StyleSheet.create({ t: { fontFamily: "Inter_500Medium", fontSize: 10 } }).t,
  searchBox: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      b: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, backgroundColor: c.card, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, height: 44 },
    }).b,
  searchInput: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ i: { flex: 1, fontSize: 14, color: c.foreground, fontFamily: "Inter_400Regular", height: 44 } }).i,
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
