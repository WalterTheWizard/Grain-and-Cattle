import { Feather } from "@expo/vector-icons";
import {
  useListTimeEntries,
  useClockIn,
  useClockOut,
  useGetMe,
  useListEmployees,
  getListTimeEntriesQueryKey,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

interface TimeEntry {
  id: number;
  employeeName: string;
  employeeId: number;
  clockIn: string;
  clockOut?: string | null;
  durationMinutes?: number | null;
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function EntryRow({ entry }: { entry: TimeEntry }) {
  const colors = useColors();
  const isOpen = !entry.clockOut;
  return (
    <View style={styles.row(colors)}>
      <View style={[styles.iconCircle, { backgroundColor: isOpen ? colors.primary + "20" : colors.muted }]}>
        <Feather name={isOpen ? "log-in" : "log-out"} size={16} color={isOpen ? colors.primary : colors.mutedForeground} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowTitle(colors)}>{entry.employeeName}</Text>
        <Text style={styles.rowSub(colors)}>
          {formatTime(entry.clockIn)} {entry.clockOut ? `→ ${formatTime(entry.clockOut)}` : "— clocked in"}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.durationText, { color: isOpen ? colors.primary : colors.mutedForeground }]}>
          {isOpen ? "Active" : formatDuration(entry.durationMinutes)}
        </Text>
      </View>
    </View>
  );
}

export default function TimeCardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const { data: employees = [] } = useListEmployees();
  const [filterEmployee, setFilterEmployee] = useState<number | null>(null);
  const [clockInLoading, setClockInLoading] = useState(false);

  const { data: entries = [], isLoading, refetch, isFetching } = useListTimeEntries(
    filterEmployee ? { employeeId: filterEmployee } : undefined,
    { query: { queryKey: getListTimeEntriesQueryKey(filterEmployee ? { employeeId: filterEmployee } : undefined) } }
  );

  const clockIn = useClockIn({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setClockInLoading(false);
      },
      onError: () => {
        Alert.alert("Error", "Could not clock in.");
        setClockInLoading(false);
      },
    },
  });

  const clockOut = useClockOut({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setClockInLoading(false);
      },
      onError: () => {
        Alert.alert("Error", "Could not clock out.");
        setClockInLoading(false);
      },
    },
  });

  const myOpenEntry = entries.find((e) => e.employeeId === me?.employeeId && !e.clockOut);
  const isClockedIn = !!myOpenEntry;

  async function handleClock() {
    setClockInLoading(true);
    if (isClockedIn) {
      clockOut.mutate({ data: {} });
    } else {
      clockIn.mutate({ data: {} });
    }
  }

  const todayEntries = entries.filter((e) => {
    const d = new Date(e.clockIn);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const todayMinutes = todayEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekEntries = entries.filter((e) => new Date(e.clockIn) >= weekAgo);
  const weekMinutes = weekEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

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
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={styles.summaryChip(colors, colors.primary)}>
            <Text style={styles.chipNum(colors.primary)}>{Math.round(todayMinutes / 60 * 10) / 10}h</Text>
            <Text style={styles.chipLabel(colors)}>Today</Text>
          </View>
          <View style={styles.summaryChip(colors, colors.mutedForeground)}>
            <Text style={styles.chipNum(colors.mutedForeground)}>{Math.round(weekMinutes / 60 * 10) / 10}h</Text>
            <Text style={styles.chipLabel(colors)}>This Week</Text>
          </View>
          <View style={styles.summaryChip(colors, colors.mutedForeground)}>
            <Text style={styles.chipNum(colors.mutedForeground)}>{entries.filter((e) => !e.clockOut).length}</Text>
            <Text style={styles.chipLabel(colors)}>Active</Text>
          </View>
        </View>

        {me?.employeeId && (
          <Pressable
            onPress={handleClock}
            disabled={clockInLoading}
            style={[
              styles.clockBtn,
              { backgroundColor: isClockedIn ? colors.destructive : colors.primary },
              clockInLoading && { opacity: 0.6 },
            ]}
          >
            {clockInLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name={isClockedIn ? "log-out" : "log-in"} size={20} color="#fff" />
                <Text style={styles.clockBtnText}>
                  {isClockedIn ? "Clock Out" : "Clock In"}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {employees.length > 1 && (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Pressable
              onPress={() => setFilterEmployee(null)}
              style={[
                styles.filterChip,
                { backgroundColor: filterEmployee === null ? colors.primary : colors.muted },
              ]}
            >
              <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: filterEmployee === null ? "#fff" : colors.foreground }}>
                All
              </Text>
            </Pressable>
            {(employees as { id: number; fullName: string }[]).map((e) => (
              <Pressable
                key={e.id}
                onPress={() => setFilterEmployee(e.id === filterEmployee ? null : e.id)}
                style={[
                  styles.filterChip,
                  { backgroundColor: filterEmployee === e.id ? colors.primary : colors.muted },
                ]}
              >
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: filterEmployee === e.id ? "#fff" : colors.foreground }}>
                  {e.fullName.split(" ")[0]}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <FlatList
        data={entries as TimeEntry[]}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <EntryRow entry={item} />}
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
                <Feather name="clock" size={40} color={colors.border} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
                  No time entries
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
  durationText: StyleSheet.create({ t: { fontSize: 13, fontFamily: "Inter_600SemiBold" } }).t,
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
    StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.mutedForeground, marginTop: 1 } }).t,
  clockBtn: StyleSheet.create({
    b: {
      height: 52,
      borderRadius: 8,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexDirection: "row" as const,
      gap: 8,
    },
  }).b,
  clockBtnText: StyleSheet.create({
    t: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  }).t,
  filterChip: StyleSheet.create({
    c: {
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
  }).c,
};
