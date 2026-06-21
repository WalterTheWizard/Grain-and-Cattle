import { Feather } from "@expo/vector-icons";
import { useGetDashboard, useGetMe, getGetDashboardQueryKey } from "@workspace/api-client-react";
import React from "react";
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  accent: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, accent, subtitle }: StatCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card(colors), { borderLeftColor: accent, borderLeftWidth: 3 }]}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={[styles.iconBox, { backgroundColor: accent + "22" }]}>
          <Feather name={icon as "activity"} size={18} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statTitle(colors)}>{title}</Text>
          <Text style={styles.statValue(colors)}>{value}</Text>
          {subtitle ? <Text style={styles.statSub(colors)}>{subtitle}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: me } = useGetMe();
  const { data: dashboard, isLoading, refetch, isFetching } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() },
  });

  const farmType = me?.farmType ?? "both";
  const showCattle = farmType === "cattle" || farmType === "both" || farmType === null;
  const showGrain = farmType === "grain" || farmType === "both" || farmType === null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "web" ? 67 + 16 : 16,
        paddingBottom: insets.bottom + 100,
        gap: 8,
      }}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={{ marginBottom: 8 }}>
        <Text style={styles.greeting(colors)}>
          {me?.employeeName ? `Hey, ${me.employeeName.split(" ")[0]}` : "Dashboard"}
        </Text>
        <Text style={styles.farmName(colors)}>{me?.farmName ?? "Your Farm"}</Text>
      </View>

      {isLoading ? (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          {showCattle && (
            <View style={{ gap: 8 }}>
              <Text style={styles.sectionLabel(colors)}>Livestock</Text>
              <View style={styles.grid}>
                <View style={{ flex: 1 }}>
                  <StatCard
                    title="Total Herd"
                    value={dashboard?.totalHerd ?? 0}
                    icon="box"
                    accent={colors.primary}
                    subtitle="All registered"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <StatCard
                    title="Active"
                    value={dashboard?.activeHead ?? 0}
                    icon="check-circle"
                    accent="#22C55E"
                    subtitle="Currently active"
                  />
                </View>
              </View>
              <View style={styles.grid}>
                <View style={{ flex: 1 }}>
                  <StatCard
                    title="Calves"
                    value={dashboard?.calves ?? 0}
                    icon="heart"
                    accent="#14B8A6"
                    subtitle="Under 1 year"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <StatCard
                    title="Tasks"
                    value={dashboard?.activeTasks ?? 0}
                    icon="clipboard"
                    accent="#F59E0B"
                    subtitle={dashboard?.activeTasks ? "Action needed" : "All clear"}
                  />
                </View>
              </View>
            </View>
          )}

          {showGrain && (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Text style={styles.sectionLabel(colors)}>Grain Operations</Text>
              <View style={styles.grid}>
                <View style={{ flex: 1 }}>
                  <StatCard
                    title="Acres Planted"
                    value={dashboard?.acresPlanted ?? 0}
                    icon="sun"
                    accent="#22C55E"
                    subtitle="Active plantings"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <StatCard
                    title="Expected Yield"
                    value={dashboard?.expectedYield ?? 0}
                    icon="trending-up"
                    accent="#F59E0B"
                    subtitle="Tons, active crops"
                  />
                </View>
              </View>
              <View style={styles.grid}>
                <View style={{ flex: 1 }}>
                  <StatCard
                    title="Stored Grain"
                    value={dashboard?.storedGrain ?? 0}
                    icon="archive"
                    accent="#6366F1"
                    subtitle="Across all bins"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <StatCard
                    title="Needs Service"
                    value={dashboard?.equipmentNeedingService ?? 0}
                    icon="tool"
                    accent="#EF4444"
                    subtitle={dashboard?.equipmentNeedingService ? "Attention needed" : "All operational"}
                  />
                </View>
              </View>
            </View>
          )}

          {dashboard && dashboard.recentRegistrations.length > 0 && showCattle && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionLabel(colors)}>Recent Cattle</Text>
              <View style={[styles.card(colors), { padding: 0, overflow: "hidden" }]}>
                {dashboard.recentRegistrations.slice(0, 5).map((c, i) => (
                  <View
                    key={c.id}
                    style={[
                      styles.cattleRow(colors),
                      i < Math.min(dashboard.recentRegistrations.length, 5) - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.tagBadge(colors)}>
                      <Text style={styles.tagText(colors)}>#{c.tagNumber}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cattleName(colors)}>{c.name || `Tag #${c.tagNumber}`}</Text>
                      <Text style={styles.cattleBreed(colors)}>{c.breed || c.gender}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: c.status === "active" ? colors.primary + "22" : colors.muted }]}>
                      <Text style={[styles.statusText, { color: c.status === "active" ? colors.primary : colors.mutedForeground }]}>
                        {c.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = {
  greeting: (c: ReturnType<typeof useColors>) => ({
    fontSize: 22,
    fontWeight: "700" as const,
    color: c.foreground,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  }),
  farmName: (c: ReturnType<typeof useColors>) => ({
    fontSize: 14,
    color: c.mutedForeground,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  }),
  sectionLabel: (c: ReturnType<typeof useColors>) => ({
    fontSize: 12,
    fontWeight: "600" as const,
    color: c.mutedForeground,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginTop: 4,
  }),
  card: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      card: {
        backgroundColor: c.card,
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: c.border,
      },
    }).card,
  grid: StyleSheet.create({ grid: { flexDirection: "row", gap: 8 } }).grid,
  iconBox: StyleSheet.create({ box: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" } }).box,
  statTitle: (c: ReturnType<typeof useColors>) => ({
    fontSize: 12,
    color: c.mutedForeground,
    fontFamily: "Inter_400Regular",
  }),
  statValue: (c: ReturnType<typeof useColors>) => ({
    fontSize: 28,
    fontWeight: "700" as const,
    color: c.foreground,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  }),
  statSub: (c: ReturnType<typeof useColors>) => ({
    fontSize: 11,
    color: c.mutedForeground,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  }),
  cattleRow: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
    }).row,
  tagBadge: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      b: { backgroundColor: c.muted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    }).b,
  tagText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.foreground } }).t,
  cattleName: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.foreground } }).t,
  cattleBreed: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.mutedForeground } }).t,
  statusBadge: StyleSheet.create({ b: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 } }).b,
  statusText: StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_500Medium" } }).t,
};
