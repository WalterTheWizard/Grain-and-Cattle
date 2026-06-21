import { Feather } from "@expo/vector-icons";
import {
  useListTasks,
  useUpdateTask,
  useCreateTask,
  useDeleteTask,
  useListEmployees,
  getListTasksQueryKey,
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
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type Task = {
  id: number;
  title: string;
  description?: string | null;
  assignedToName?: string | null;
  dueDate?: string | null;
  timeToFinish?: string | null;
  status: string;
  completedAt?: string | null;
};

function TaskCard({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const colors = useColors();
  const isPending = task.status === "pending";
  const { me } = useAuth();
  const isAdmin = me?.role !== "employee";

  return (
    <View style={styles.card(colors)}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <Pressable
          onPress={onToggle}
          style={[
            styles.checkbox(colors),
            !isPending && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          testID={`btn-toggle-${task.id}`}
        >
          {!isPending && <Feather name="check" size={13} color="#fff" />}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.taskTitle(colors),
              !isPending && { textDecorationLine: "line-through", color: colors.mutedForeground },
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          {task.description ? (
            <Text style={styles.taskDesc(colors)} numberOfLines={2}>{task.description}</Text>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {task.assignedToName ? (
              <View style={styles.metaTag(colors)}>
                <Feather name="user" size={10} color={colors.mutedForeground} />
                <Text style={styles.metaText(colors)}>{task.assignedToName}</Text>
              </View>
            ) : null}
            {task.dueDate ? (
              <View style={styles.metaTag(colors)}>
                <Feather name="calendar" size={10} color={colors.mutedForeground} />
                <Text style={styles.metaText(colors)}>{task.dueDate}</Text>
              </View>
            ) : null}
            {task.timeToFinish ? (
              <View style={styles.metaTag(colors)}>
                <Feather name="clock" size={10} color={colors.mutedForeground} />
                <Text style={styles.metaText(colors)}>{task.timeToFinish}</Text>
              </View>
            ) : null}
            {task.completedAt ? (
              <View style={[styles.metaTag(colors), { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.metaText(colors), { color: colors.primary }]}>
                  Done {new Date(task.completedAt).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        {isAdmin && (
          <Pressable onPress={onDelete} style={{ padding: 6 }}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { me } = useAuth();
  const isAdmin = me?.role !== "employee";
  const [tab, setTab] = useState<"pending" | "completed">("pending");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [timeToFinish, setTimeToFinish] = useState("");

  const { data: pending = [], isLoading: loadP, refetch: refetchP, isFetching: fetchP } = useListTasks(
    { status: "pending" },
    { query: { queryKey: getListTasksQueryKey({ status: "pending" }) } }
  );
  const { data: completed = [], isLoading: loadC, refetch: refetchC, isFetching: fetchC } = useListTasks(
    { status: "completed" },
    { query: { queryKey: getListTasksQueryKey({ status: "completed" }) } }
  );
  const { data: employees = [] } = useListEmployees();

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
    },
  });

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setShowAddModal(false);
        resetForm();
      },
    },
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
    },
  });

  const items = tab === "pending" ? (pending as Task[]) : (completed as Task[]);
  const isLoading = tab === "pending" ? loadP : loadC;
  const isFetching = tab === "pending" ? fetchP : fetchC;
  const refetch = tab === "pending" ? refetchP : refetchC;

  async function toggleTask(task: Task) {
    const newStatus = task.status === "pending" ? "completed" : "pending";
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateTask.mutate({ id: task.id, data: { status: newStatus } });
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setAssignedToId("");
    setDueDate("");
    setTimeToFinish("");
  }

  function handleAdd() {
    if (!title.trim()) {
      Alert.alert("Missing Field", "Please enter a task title.");
      return;
    }
    createTask.mutate({
      data: {
        title: title.trim(),
        description: description.trim() || undefined,
        assignedToId: assignedToId ? parseInt(assignedToId, 10) : undefined,
        dueDate: dueDate || undefined,
        timeToFinish: timeToFinish || undefined,
      },
    });
  }

  function handleDeleteTask(id: number) {
    Alert.alert("Delete Task", "Remove this task?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteTask.mutate({ id }) },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "web" ? 67 + 16 : 16,
          paddingBottom: 12,
        }}
      >
        <View style={styles.tabBar(colors)}>
          <Pressable
            style={[styles.tabBtn(colors), tab === "pending" && styles.tabBtnActive(colors)]}
            onPress={() => setTab("pending")}
          >
            <Text style={[styles.tabBtnText(colors), tab === "pending" && { color: colors.primary }]}>
              Pending
            </Text>
            {pending.length > 0 && (
              <View style={[styles.badge(colors), tab === "pending" && { backgroundColor: colors.primary }]}>
                <Text style={[styles.badgeText, tab === "pending" && { color: "#fff" }]}>{pending.length}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[styles.tabBtn(colors), tab === "completed" && styles.tabBtnActive(colors)]}
            onPress={() => setTab("completed")}
          >
            <Text style={[styles.tabBtnText(colors), tab === "completed" && { color: colors.primary }]}>
              Completed
            </Text>
          </Pressable>
        </View>
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
              marginTop: 8,
            }}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Post New Job</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggle={() => toggleTask(item)}
            onDelete={() => handleDeleteTask(item.id)}
          />
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
                <Feather name="clipboard" size={40} color={colors.border} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
                  {tab === "pending" ? "No pending tasks" : "No completed tasks"}
                </Text>
              </>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={() => setShowAddModal(false)}>
            <View style={[styles.sheet(colors), { paddingBottom: insets.bottom + 16 }]}>
              <Text style={styles.sheetTitle(colors)}>Post New Job</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Title *</Text>
                    <TextInput style={styles.input(colors)} value={title} onChangeText={setTitle} placeholder="e.g. Vaccinate herd" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Description</Text>
                    <TextInput style={[styles.input(colors), { height: 60, textAlignVertical: "top" }]} value={description} onChangeText={setDescription} placeholder="Details..." multiline />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Assign To</Text>
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      <Pressable
                        onPress={() => setAssignedToId("")}
                        style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: colors.radius, backgroundColor: assignedToId === "" ? colors.primary + "15" : colors.muted, borderWidth: 1, borderColor: assignedToId === "" ? colors.primary : colors.border }}
                      >
                        <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: assignedToId === "" ? colors.primary : colors.foreground }}>Unassigned</Text>
                      </Pressable>
                      {(employees as { id: number; fullName: string }[]).map((e) => (
                        <Pressable
                          key={e.id}
                          onPress={() => setAssignedToId(String(e.id))}
                          style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: colors.radius, backgroundColor: assignedToId === String(e.id) ? colors.primary + "15" : colors.muted, borderWidth: 1, borderColor: assignedToId === String(e.id) ? colors.primary : colors.border }}
                        >
                          <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: assignedToId === String(e.id) ? colors.primary : colors.foreground }}>{e.fullName}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Due Date</Text>
                      <TextInput style={styles.input(colors)} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, textTransform: "uppercase" }}>Time Estimate</Text>
                      <TextInput style={styles.input(colors)} value={timeToFinish} onChangeText={setTimeToFinish} placeholder="e.g. 2 hours" />
                    </View>
                  </View>
                  <Pressable
                    onPress={handleAdd}
                    disabled={createTask.isPending || !title.trim()}
                    style={[styles.saveBtn(colors), (createTask.isPending || !title.trim()) && { opacity: 0.6 }]}
                  >
                    <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                      {createTask.isPending ? "Posting..." : "Post Job"}
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
  card: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      card: { backgroundColor: c.card, borderRadius: c.radius, padding: 14, borderWidth: 1, borderColor: c.border },
    }).card,
  checkbox: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      cb: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: c.border, alignItems: "center" as const, justifyContent: "center" as const, marginTop: 1 },
    }).cb,
  taskTitle: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.foreground } }).t,
  taskDesc: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 2 } }).t,
  metaTag: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, backgroundColor: c.muted, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
    }).t,
  metaText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.mutedForeground } }).t,
  tabBar: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      b: { flexDirection: "row" as const, backgroundColor: c.muted, borderRadius: c.radius, padding: 3 },
    }).b,
  tabBtn: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      b: { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 6, paddingVertical: 8, borderRadius: c.radius - 2 },
    }).b,
  tabBtnActive: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ b: { backgroundColor: c.card, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 } }).b,
  tabBtnText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.mutedForeground } }).t,
  badge: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ b: { backgroundColor: c.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: "center" as const } }).b,
  badgeText: StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#666" } }).t,
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
