import { Feather } from "@expo/vector-icons";
import {
  useListCrops,
  useListStorageBins,
  useListEquipment,
} from "@workspace/api-client-react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Crop = {
  id: number;
  cropType: string;
  variety?: string | null;
  acreage?: number | null;
  status: string;
  season?: string | null;
  expectedYield?: number | null;
};

type StorageBin = {
  id: number;
  name: string;
  contents?: string | null;
  capacity?: number | null;
  currentQuantity?: number | null;
  condition?: string | null;
};

type Equipment = {
  id: number;
  name: string;
  type?: string | null;
  status: string;
};

function SectionChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 8,
        borderRadius: colors.radius - 2,
        backgroundColor: active ? colors.card : "transparent",
        alignItems: "center",
        shadowColor: active ? "#000" : "transparent",
        shadowOpacity: active ? 0.05 : 0,
        shadowRadius: active ? 4 : 0,
        elevation: active ? 2 : 0,
      }}
    >
      <Text style={{ fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 13, color: active ? colors.primary : colors.mutedForeground }}>
        {label}
      </Text>
    </Pressable>
  );
}

function CropRow({ item }: { item: Crop }) {
  const colors = useColors();
  const statusColor = item.status === "active" ? colors.primary : item.status === "harvested" ? "#22C55E" : colors.mutedForeground;
  return (
    <View style={styles.row(colors)}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
        <Feather name="sun" size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowTitle(colors)}>{item.cropType}{item.variety ? ` · ${item.variety}` : ""}</Text>
        <Text style={styles.rowSub(colors)}>
          {[item.acreage ? `${item.acreage} ac` : null, item.season, item.expectedYield ? `~${item.expectedYield}t yield` : null].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <View style={[styles.statusTag, { backgroundColor: statusColor + "20" }]}>
        <Text style={[styles.statusTxt, { color: statusColor }]}>{item.status}</Text>
      </View>
    </View>
  );
}

function BinRow({ item }: { item: StorageBin }) {
  const colors = useColors();
  const pct = item.capacity && item.currentQuantity != null
    ? Math.min(100, Math.round((item.currentQuantity / item.capacity) * 100))
    : null;
  return (
    <View style={styles.row(colors)}>
      <View style={[styles.iconCircle, { backgroundColor: "#6366F1" + "20" }]}>
        <Feather name="archive" size={16} color="#6366F1" />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowTitle(colors)}>{item.name}</Text>
        <Text style={styles.rowSub(colors)}>
          {item.contents || "Empty"}{item.capacity ? ` · ${item.currentQuantity ?? 0}/${item.capacity} bu` : ""}
        </Text>
        {pct !== null && (
          <View style={{ marginTop: 6, height: 4, backgroundColor: colors.border, borderRadius: 2 }}>
            <View style={{ width: `${pct}%` as any, height: 4, backgroundColor: pct > 80 ? "#EF4444" : "#6366F1", borderRadius: 2 }} />
          </View>
        )}
      </View>
      <Text style={styles.pctText(colors)}>{pct !== null ? `${pct}%` : ""}</Text>
    </View>
  );
}

function EquipRow({ item }: { item: Equipment }) {
  const colors = useColors();
  const needsService = item.status === "maintenance" || item.status === "out_of_service";
  return (
    <View style={styles.row(colors)}>
      <View style={[styles.iconCircle, { backgroundColor: (needsService ? "#EF4444" : "#F59E0B") + "20" }]}>
        <Feather name="tool" size={16} color={needsService ? "#EF4444" : "#F59E0B"} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowTitle(colors)}>{item.name}</Text>
        <Text style={styles.rowSub(colors)}>{item.type || "Equipment"}</Text>
      </View>
      <View style={[styles.statusTag, { backgroundColor: (needsService ? "#EF4444" : colors.primary) + "20" }]}>
        <Text style={[styles.statusTxt, { color: needsService ? "#EF4444" : colors.primary }]}>{item.status}</Text>
      </View>
    </View>
  );
}

export default function GrainScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<"crops" | "storage" | "equipment">("crops");

  const { data: crops = [], isLoading: lCrops, refetch: rCrops, isFetching: fCrops } = useListCrops();
  const { data: bins = [], isLoading: lBins, refetch: rBins, isFetching: fBins } = useListStorageBins();
  const { data: equip = [], isLoading: lEquip, refetch: rEquip, isFetching: fEquip } = useListEquipment();

  const isLoading = section === "crops" ? lCrops : section === "storage" ? lBins : lEquip;
  const isFetching = section === "crops" ? fCrops : section === "storage" ? fBins : fEquip;
  const refetch = section === "crops" ? rCrops : section === "storage" ? rBins : rEquip;

  const items = section === "crops" ? (crops as Crop[]) : section === "storage" ? (bins as StorageBin[]) : (equip as Equipment[]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "web" ? 67 + 16 : 16,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", backgroundColor: colors.muted, borderRadius: colors.radius, padding: 3 }}>
          <SectionChip label="Crops" active={section === "crops"} onPress={() => setSection("crops")} />
          <SectionChip label="Storage" active={section === "storage"} onPress={() => setSection("storage")} />
          <SectionChip label="Equipment" active={section === "equipment"} onPress={() => setSection("equipment")} />
        </View>
      </View>

      <FlatList
        data={items as any[]}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) =>
          section === "crops" ? <CropRow item={item} /> :
          section === "storage" ? <BinRow item={item} /> :
          <EquipRow item={item} />
        }
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
                <Feather name="inbox" size={40} color={colors.border} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
                  No {section} records found
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
  statusTag: StyleSheet.create({ t: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 } }).t,
  statusTxt: StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_600SemiBold" } }).t,
  pctText: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.mutedForeground, marginLeft: 8 } }).t,
};
