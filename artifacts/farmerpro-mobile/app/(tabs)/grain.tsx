import { Feather } from "@expo/vector-icons";
import {
  useListCrops,
  useListStorageBins,
  useListEquipment,
  useListInputs,
  useCreateCrop,
  useUpdateCrop,
  useCreateStorageBin,
  useCreateEquipment,
  useCreateInput,
  useDeleteCrop,
  useDeleteStorageBin,
  useDeleteEquipment,
  useDeleteInput,
  getListCropsQueryKey,
  getListStorageBinsQueryKey,
  getListEquipmentQueryKey,
  getListInputsQueryKey,
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

type Crop = {
  id: number;
  cropType: string;
  variety?: string | null;
  acreage?: number | null;
  status: string;
  season?: string | null;
  expectedYield?: number | null;
  actualYield?: number | null;
  harvestDate?: string | null;
  yieldUnit?: string | null;
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

type Input = {
  id: number;
  name: string;
  category: string;
  quantityOnHand?: number | null;
  unit?: string | null;
};

function SectionChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
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
      <Text
        style={{
          fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
          fontSize: 13,
          color: active ? colors.primary : colors.mutedForeground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CropRow({
  item,
  onEdit,
  onDelete,
  isAdmin,
}: {
  item: Crop;
  onEdit: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  const colors = useColors();
  const statusColor =
    item.status === "active" || item.status === "growing"
      ? colors.primary
      : item.status === "harvested"
      ? "#22C55E"
      : colors.mutedForeground;
  return (
    <View style={styles.row(colors)}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
        <Feather name="sun" size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowTitle(colors)}>
          {item.cropType}
          {item.variety ? ` · ${item.variety}` : ""}
        </Text>
        <Text style={styles.rowSub(colors)}>
          {[
            item.acreage ? `${item.acreage} ac` : null,
            item.season,
            item.expectedYield ? `~${item.expectedYield}t yield` : null,
            item.actualYield != null ? `Actual: ${item.actualYield}` : null,
            item.harvestDate ? `Harvested: ${item.harvestDate}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={[styles.statusTag, { backgroundColor: statusColor + "20" }]}>
          <Text style={[styles.statusTxt, { color: statusColor }]}>{item.status}</Text>
        </View>
        {isAdmin && (
          <>
            <Pressable onPress={onEdit} style={{ padding: 4 }}>
              <Feather name="edit-2" size={14} color={colors.mutedForeground} />
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

function BinRow({
  item,
  onDelete,
}: {
  item: StorageBin;
  onDelete: () => void;
}) {
  const colors = useColors();
  const pct =
    item.capacity && item.currentQuantity != null
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
          {item.contents || "Empty"}
          {item.capacity
            ? ` · ${item.currentQuantity ?? 0}/${item.capacity} bu`
            : ""}
        </Text>
        {pct !== null && (
          <View
            style={{
              marginTop: 6,
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 2,
            }}
          >
            <View
              style={{
                width: `${pct}%` as any,
                height: 4,
                backgroundColor: pct > 80 ? "#EF4444" : "#6366F1",
                borderRadius: 2,
              }}
            />
          </View>
        )}
      </View>
      <Pressable onPress={onDelete} style={{ padding: 4 }}>
        <Feather name="trash-2" size={16} color={colors.destructive} />
      </Pressable>
    </View>
  );
}

function EquipRow({
  item,
  onDelete,
}: {
  item: Equipment;
  onDelete: () => void;
}) {
  const colors = useColors();
  const needsService =
    item.status === "maintenance" || item.status === "out_of_service";
  return (
    <View style={styles.row(colors)}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: (needsService ? "#EF4444" : "#F59E0B") + "20" },
        ]}
      >
        <Feather
          name="tool"
          size={16}
          color={needsService ? "#EF4444" : "#F59E0B"}
        />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowTitle(colors)}>{item.name}</Text>
        <Text style={styles.rowSub(colors)}>{item.type || "Equipment"}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={[
            styles.statusTag,
            {
              backgroundColor:
                (needsService ? "#EF4444" : colors.primary) + "20",
            },
          ]}
        >
          <Text
            style={[
              styles.statusTxt,
              { color: needsService ? "#EF4444" : colors.primary },
            ]}
          >
            {item.status}
          </Text>
        </View>
        <Pressable onPress={onDelete} style={{ padding: 4 }}>
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </Pressable>
      </View>
    </View>
  );
}

function InputRow({
  item,
  onDelete,
}: {
  item: Input;
  onDelete: () => void;
}) {
  const colors = useColors();
  const catColor =
    item.category === "seed"
      ? colors.primary
      : item.category === "fertilizer"
      ? "#F59E0B"
      : item.category === "chemical"
      ? "#EF4444"
      : colors.mutedForeground;
  return (
    <View style={styles.row(colors)}>
      <View style={[styles.iconCircle, { backgroundColor: catColor + "20" }]}>
        <Feather name="package" size={16} color={catColor} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowTitle(colors)}>{item.name}</Text>
        <Text style={styles.rowSub(colors)}>
          {item.category}
          {item.quantityOnHand != null
            ? ` · ${item.quantityOnHand} ${item.unit ?? ""}`
            : ""}
        </Text>
      </View>
      <Pressable onPress={onDelete} style={{ padding: 4 }}>
        <Feather name="trash-2" size={16} color={colors.destructive} />
      </Pressable>
    </View>
  );
}

const CROP_STATUSES = ["planned", "planted", "growing", "harvested"] as const;

export default function GrainScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { me } = useAuth();
  const isAdmin = me?.role !== "employee";
  const [section, setSection] = useState<
    "crops" | "storage" | "equipment" | "inputs"
  >("crops");
  const [showAddModal, setShowAddModal] = useState(false);

  // Crop edit state
  const [editingCropId, setEditingCropId] = useState<number | null>(null);

  // Form fields – crops
  const [addName, setAddName] = useState("");
  const [addVariety, setAddVariety] = useState("");
  const [addAcreage, setAddAcreage] = useState("");
  const [addSeason, setAddSeason] = useState("");
  const [addCropStatus, setAddCropStatus] = useState<string>("planned");
  const [addExpectedYield, setAddExpectedYield] = useState("");
  const [addActualYield, setAddActualYield] = useState("");
  const [addHarvestDate, setAddHarvestDate] = useState("");
  // Form fields – storage
  const [addCapacity, setAddCapacity] = useState("");
  const [addContents, setAddContents] = useState("");
  const [addCurrentQty, setAddCurrentQty] = useState("");
  // Form fields – inputs
  const [addCategory, setAddCategory] = useState<
    "seed" | "fertilizer" | "chemical" | "other"
  >("seed");
  const [addUnit, setAddUnit] = useState("");
  const [addQty, setAddQty] = useState("");
  const [addCost, setAddCost] = useState("");
  // Form fields – equipment
  const [addType, setAddType] = useState("");
  const [addStatus, setAddStatus] = useState("");
  const [addMake, setAddMake] = useState("");
  const [addModel, setAddModel] = useState("");
  const [addYear, setAddYear] = useState("");
  const [addHours, setAddHours] = useState("");

  const {
    data: crops = [],
    isLoading: lCrops,
    refetch: rCrops,
    isFetching: fCrops,
  } = useListCrops({ query: { queryKey: getListCropsQueryKey() } });
  const {
    data: bins = [],
    isLoading: lBins,
    refetch: rBins,
    isFetching: fBins,
  } = useListStorageBins({ query: { queryKey: getListStorageBinsQueryKey() } });
  const {
    data: equip = [],
    isLoading: lEquip,
    refetch: rEquip,
    isFetching: fEquip,
  } = useListEquipment({ query: { queryKey: getListEquipmentQueryKey() } });
  const {
    data: inputs = [],
    isLoading: lInputs,
    refetch: rInputs,
    isFetching: fInputs,
  } = useListInputs({ query: { queryKey: getListInputsQueryKey() } });

  const createCrop = useCreateCrop({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCropsQueryKey() });
        setShowAddModal(false);
        resetForm();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });
  const updateCrop = useUpdateCrop({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCropsQueryKey() });
        setShowAddModal(false);
        setEditingCropId(null);
        resetForm();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });
  const createBin = useCreateStorageBin({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStorageBinsQueryKey() });
        setShowAddModal(false);
        resetForm();
      },
    },
  });
  const createEquip = useCreateEquipment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEquipmentQueryKey() });
        setShowAddModal(false);
        resetForm();
      },
    },
  });
  const createInput = useCreateInput({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInputsQueryKey() });
        setShowAddModal(false);
        resetForm();
      },
    },
  });

  const deleteCrop = useDeleteCrop({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getListCropsQueryKey() }),
    },
  });
  const deleteBin = useDeleteStorageBin({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getListStorageBinsQueryKey() }),
    },
  });
  const deleteEquip = useDeleteEquipment({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getListEquipmentQueryKey() }),
    },
  });
  const deleteInput = useDeleteInput({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getListInputsQueryKey() }),
    },
  });

  function resetForm() {
    setAddName("");
    setAddVariety("");
    setAddAcreage("");
    setAddSeason("");
    setAddCropStatus("planned");
    setAddExpectedYield("");
    setAddActualYield("");
    setAddHarvestDate("");
    setAddCapacity("");
    setAddContents("");
    setAddCurrentQty("");
    setAddCategory("seed");
    setAddUnit("");
    setAddQty("");
    setAddCost("");
    setAddStatus("");
    setAddMake("");
    setAddModel("");
    setAddYear("");
    setAddHours("");
    setEditingCropId(null);
  }

  function openEditCrop(crop: Crop) {
    setEditingCropId(crop.id);
    setAddName(crop.cropType);
    setAddVariety(crop.variety ?? "");
    setAddAcreage(crop.acreage?.toString() ?? "");
    setAddSeason(crop.season ?? "");
    setAddCropStatus(crop.status);
    setAddExpectedYield(crop.expectedYield?.toString() ?? "");
    setAddActualYield(crop.actualYield?.toString() ?? "");
    setAddHarvestDate(crop.harvestDate ?? "");
    setShowAddModal(true);
  }

  const isLoading =
    section === "crops"
      ? lCrops
      : section === "storage"
      ? lBins
      : section === "equipment"
      ? lEquip
      : lInputs;
  const isFetching =
    section === "crops"
      ? fCrops
      : section === "storage"
      ? fBins
      : section === "equipment"
      ? fEquip
      : fInputs;
  const refetch =
    section === "crops"
      ? rCrops
      : section === "storage"
      ? rBins
      : section === "equipment"
      ? rEquip
      : rInputs;
  const items =
    section === "crops"
      ? (crops as Crop[])
      : section === "storage"
      ? (bins as StorageBin[])
      : section === "equipment"
      ? (equip as Equipment[])
      : (inputs as Input[]);

  function handleAdd() {
    if (!addName.trim()) {
      Alert.alert("Missing Field", "Name is required.");
      return;
    }
    if (section === "crops") {
      const cropData = {
        cropType: addName.trim(),
        variety: addVariety.trim() || undefined,
        acreage: addAcreage ? parseFloat(addAcreage) : undefined,
        season: addSeason.trim() || undefined,
        status: addCropStatus as any,
        expectedYield: addExpectedYield ? parseFloat(addExpectedYield) : undefined,
        actualYield: addActualYield ? parseFloat(addActualYield) : undefined,
        harvestDate: addHarvestDate || undefined,
      };
      if (editingCropId != null) {
        updateCrop.mutate({ id: editingCropId, data: cropData });
      } else {
        createCrop.mutate({ data: cropData });
      }
    } else if (section === "storage") {
      createBin.mutate({
        data: {
          name: addName.trim(),
          grainType: addContents.trim() || undefined,
          capacity: addCapacity ? parseFloat(addCapacity) : undefined,
          currentQuantity: addCurrentQty ? parseFloat(addCurrentQty) : undefined,
        },
      });
    } else if (section === "equipment") {
      createEquip.mutate({
        data: {
          name: addName.trim(),
          type: (addType as any) || "other",
          status: (addStatus as any) || "operational",
          make: addMake.trim() || undefined,
          model: addModel.trim() || undefined,
          year: addYear ? parseInt(addYear, 10) : undefined,
          hoursUsed: addHours ? parseFloat(addHours) : undefined,
        },
      });
    } else if (section === "inputs") {
      createInput.mutate({
        data: {
          name: addName.trim(),
          category: addCategory,
          unit: addUnit.trim() || undefined,
          quantityOnHand: addQty ? parseFloat(addQty) : undefined,
          costPerUnit: addCost ? parseFloat(addCost) : undefined,
        },
      });
    }
  }

  function handleDelete(id: number) {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (section === "crops") deleteCrop.mutate({ id });
          else if (section === "storage") deleteBin.mutate({ id });
          else if (section === "equipment") deleteEquip.mutate({ id });
          else deleteInput.mutate({ id });
        },
      },
    ]);
  }

  const isSaving =
    createCrop.isPending ||
    updateCrop.isPending ||
    createBin.isPending ||
    createEquip.isPending ||
    createInput.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "web" ? 67 + 16 : 16,
          paddingBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.muted,
            borderRadius: colors.radius,
            padding: 3,
          }}
        >
          <SectionChip
            label="Crops"
            active={section === "crops"}
            onPress={() => setSection("crops")}
          />
          <SectionChip
            label="Storage"
            active={section === "storage"}
            onPress={() => setSection("storage")}
          />
          <SectionChip
            label="Equip"
            active={section === "equipment"}
            onPress={() => setSection("equipment")}
          />
          <SectionChip
            label="Inputs"
            active={section === "inputs"}
            onPress={() => setSection("inputs")}
          />
        </View>
        {isAdmin && (
          <Pressable
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
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
            <Text
              style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}
            >
              Add{" "}
              {section === "crops"
                ? "Crop"
                : section === "storage"
                ? "Bin"
                : section === "equipment"
                ? "Equipment"
                : "Input"}
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={items as any[]}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) =>
          section === "crops" ? (
            <CropRow
              item={item}
              isAdmin={isAdmin}
              onEdit={() => openEditCrop(item)}
              onDelete={() => handleDelete(item.id)}
            />
          ) : section === "storage" ? (
            <BinRow item={item} onDelete={() => handleDelete(item.id)} />
          ) : section === "equipment" ? (
            <EquipRow item={item} onDelete={() => handleDelete(item.id)} />
          ) : (
            <InputRow item={item} onDelete={() => handleDelete(item.id)} />
          )
        }
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
                <Feather name="inbox" size={40} color={colors.border} />
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                  }}
                >
                  No {section} records found
                </Text>
              </>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add / Edit Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              setShowAddModal(false);
              resetForm();
            }}
          >
            <View style={[styles.sheet(colors), { paddingBottom: insets.bottom + 16 }]}>
              <Text style={styles.sheetTitle(colors)}>
                {section === "crops"
                  ? editingCropId != null
                    ? "Edit Crop"
                    : "Add Crop"
                  : section === "storage"
                  ? "Add Storage Bin"
                  : section === "equipment"
                  ? "Add Equipment"
                  : "Add Input"}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={styles.lbl(colors)}>
                      {section === "crops" ? "Crop Type" : "Name"} *
                    </Text>
                    <TextInput
                      style={styles.input(colors)}
                      value={addName}
                      onChangeText={setAddName}
                      placeholder={section === "crops" ? "e.g. Corn" : "Name"}
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>

                  {section === "crops" && (
                    <>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Variety</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addVariety}
                            onChangeText={setAddVariety}
                            placeholder="Variety"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Acreage</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addAcreage}
                            onChangeText={setAddAcreage}
                            placeholder="0.0"
                            keyboardType="numeric"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Season</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addSeason}
                            onChangeText={setAddSeason}
                            placeholder="e.g. Spring 2026"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Status</Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                          >
                            <View style={{ flexDirection: "row", gap: 4 }}>
                              {CROP_STATUSES.map((s) => (
                                <Pressable
                                  key={s}
                                  onPress={() => setAddCropStatus(s)}
                                  style={{
                                    paddingVertical: 6,
                                    paddingHorizontal: 8,
                                    borderRadius: 6,
                                    backgroundColor:
                                      addCropStatus === s
                                        ? colors.primary + "15"
                                        : colors.muted,
                                    borderWidth: 1,
                                    borderColor:
                                      addCropStatus === s
                                        ? colors.primary
                                        : colors.border,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontFamily: "Inter_500Medium",
                                      color:
                                        addCropStatus === s
                                          ? colors.primary
                                          : colors.foreground,
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    {s}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Expected Yield</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addExpectedYield}
                            onChangeText={setAddExpectedYield}
                            placeholder="0"
                            keyboardType="numeric"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Actual Yield</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addActualYield}
                            onChangeText={setAddActualYield}
                            placeholder="0"
                            keyboardType="numeric"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                      </View>
                      <View>
                        <Text style={styles.lbl(colors)}>Harvest Date</Text>
                        <TextInput
                          style={styles.input(colors)}
                          value={addHarvestDate}
                          onChangeText={setAddHarvestDate}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={colors.mutedForeground}
                        />
                      </View>
                    </>
                  )}

                  {section === "storage" && (
                    <>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Capacity</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addCapacity}
                            onChangeText={setAddCapacity}
                            placeholder="0.0"
                            keyboardType="numeric"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Current Qty</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addCurrentQty}
                            onChangeText={setAddCurrentQty}
                            placeholder="0.0"
                            keyboardType="numeric"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                      </View>
                      <View>
                        <Text style={styles.lbl(colors)}>Contents</Text>
                        <TextInput
                          style={styles.input(colors)}
                          value={addContents}
                          onChangeText={setAddContents}
                          placeholder="e.g. Corn"
                          placeholderTextColor={colors.mutedForeground}
                        />
                      </View>
                    </>
                  )}

                  {section === "equipment" && (
                    <>
                      <View>
                        <Text style={styles.lbl(colors)}>Type</Text>
                        <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
                          {(
                            [
                              "tractor",
                              "combine",
                              "planter",
                              "sprayer",
                              "truck",
                              "other",
                            ] as const
                          ).map((t) => (
                            <Pressable
                              key={t}
                              onPress={() => setAddType(t)}
                              style={{
                                paddingVertical: 6,
                                paddingHorizontal: 8,
                                borderRadius: 6,
                                backgroundColor:
                                  addType === t
                                    ? colors.primary + "15"
                                    : colors.muted,
                                borderWidth: 1,
                                borderColor:
                                  addType === t ? colors.primary : colors.border,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontFamily: "Inter_500Medium",
                                  color:
                                    addType === t
                                      ? colors.primary
                                      : colors.foreground,
                                  textTransform: "capitalize",
                                }}
                              >
                                {t}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                      <View>
                        <Text style={styles.lbl(colors)}>Status</Text>
                        <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
                          {(
                            [
                              "operational",
                              "maintenance",
                              "repair",
                              "retired",
                            ] as const
                          ).map((s) => (
                            <Pressable
                              key={s}
                              onPress={() => setAddStatus(s)}
                              style={{
                                paddingVertical: 6,
                                paddingHorizontal: 8,
                                borderRadius: 6,
                                backgroundColor:
                                  addStatus === s
                                    ? colors.primary + "15"
                                    : colors.muted,
                                borderWidth: 1,
                                borderColor:
                                  addStatus === s
                                    ? colors.primary
                                    : colors.border,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontFamily: "Inter_500Medium",
                                  color:
                                    addStatus === s
                                      ? colors.primary
                                      : colors.foreground,
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
                          <Text style={styles.lbl(colors)}>Make</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addMake}
                            onChangeText={setAddMake}
                            placeholder="Make"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Model</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addModel}
                            onChangeText={setAddModel}
                            placeholder="Model"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Year</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addYear}
                            onChangeText={setAddYear}
                            placeholder="Year"
                            keyboardType="numeric"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Hours</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addHours}
                            onChangeText={setAddHours}
                            placeholder="Hours"
                            keyboardType="numeric"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                      </View>
                    </>
                  )}

                  {section === "inputs" && (
                    <>
                      <View>
                        <Text style={styles.lbl(colors)}>Category</Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {(
                            ["seed", "fertilizer", "chemical", "other"] as const
                          ).map((c) => (
                            <Pressable
                              key={c}
                              onPress={() => setAddCategory(c)}
                              style={{
                                flex: 1,
                                paddingVertical: 10,
                                borderRadius: colors.radius,
                                backgroundColor:
                                  addCategory === c
                                    ? colors.primary + "15"
                                    : colors.muted,
                                borderWidth: 1,
                                borderColor:
                                  addCategory === c
                                    ? colors.primary
                                    : colors.border,
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontFamily: "Inter_500Medium",
                                  color:
                                    addCategory === c
                                      ? colors.primary
                                      : colors.foreground,
                                  textTransform: "capitalize",
                                }}
                              >
                                {c}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Unit</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addUnit}
                            onChangeText={setAddUnit}
                            placeholder="e.g. lbs, gal"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbl(colors)}>Qty</Text>
                          <TextInput
                            style={styles.input(colors)}
                            value={addQty}
                            onChangeText={setAddQty}
                            placeholder="0.0"
                            keyboardType="numeric"
                            placeholderTextColor={colors.mutedForeground}
                          />
                        </View>
                      </View>
                      <View>
                        <Text style={styles.lbl(colors)}>Cost/Unit</Text>
                        <TextInput
                          style={styles.input(colors)}
                          value={addCost}
                          onChangeText={setAddCost}
                          placeholder="0.00"
                          keyboardType="numeric"
                          placeholderTextColor={colors.mutedForeground}
                        />
                      </View>
                    </>
                  )}

                  <Pressable
                    onPress={handleAdd}
                    disabled={isSaving || !addName.trim()}
                    style={[
                      styles.saveBtn(colors),
                      (isSaving || !addName.trim()) && { opacity: 0.6 },
                    ]}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 15,
                      }}
                    >
                      {isSaving
                        ? "Saving..."
                        : section === "crops" && editingCropId != null
                        ? "Save Changes"
                        : "Add"}
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
    StyleSheet.create({
      t: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.foreground },
    }).t,
  rowSub: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      t: {
        fontSize: 12,
        fontFamily: "Inter_400Regular",
        color: c.mutedForeground,
        marginTop: 2,
      },
    }).t,
  statusTag: StyleSheet.create({
    t: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  }).t,
  statusTxt: StyleSheet.create({
    t: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  }).t,
  backdrop: StyleSheet.create({
    b: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end" as const,
    },
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
      t: {
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
        color: c.foreground,
        marginBottom: 12,
      },
    }).t,
  lbl: (c: ReturnType<typeof useColors>) =>
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
