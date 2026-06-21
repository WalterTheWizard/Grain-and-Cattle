import { Feather } from "@expo/vector-icons";
import {
  useListTasks,
  useUpdateTask,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

function TaskCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const colors = useColors();
  const isPending = task.status === "pending";

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
      </View>
    </View>
  );
}

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"pending" | "completed">("pending");

  const { data: pending = [], isLoading: loadP, refetch: refetchP, isFetching: fetchP } = useListTasks(
    { status: "pending" },
    { query: { queryKey: getListTasksQueryKey({ status: "pending" }) } }
  );
  const { data: completed = [], isLoading: loadC, refetch: refetchC, isFetching: fetchC } = useListTasks(
    { status: "completed" },
    { query: { queryKey: getListTasksQueryKey({ status: "completed" }) } }
  );

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
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
                <Text style={[styles.badgeText, tab === "pending" && { color: "#fff" }]}>
                  {pending.length}
                </Text>
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
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TaskCard task={item} onToggle={() => toggleTask(item)} />}
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
    </View>
  );
}

const styles = {
  card: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      card: {
        backgroundColor: c.card,
        borderRadius: c.radius,
        padding: 14,
        borderWidth: 1,
        borderColor: c.border,
      },
    }).card,
  checkbox: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      cb: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: c.border,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        marginTop: 1,
      },
    }).cb,
  taskTitle: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.foreground } }).t,
  taskDesc: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 2 } }).t,
  metaTag: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 4,
        backgroundColor: c.muted,
        borderRadius: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
      },
    }).t,
  metaText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.mutedForeground } }).t,
  tabBar: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      b: {
        flexDirection: "row" as const,
        backgroundColor: c.muted,
        borderRadius: c.radius,
        padding: 3,
      },
    }).b,
  tabBtn: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      b: {
        flex: 1,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 6,
        paddingVertical: 8,
        borderRadius: c.radius - 2,
      },
    }).b,
  tabBtnActive: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ b: { backgroundColor: c.card, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 } }).b,
  tabBtnText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.mutedForeground } }).t,
  badge: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ b: { backgroundColor: c.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: "center" as const } }).b,
  badgeText: StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#666" } }).t,
};
