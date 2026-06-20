import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCrops, useCreateCrop, useUpdateCrop, useDeleteCrop,
  useGetMe, getListCropsQueryKey, getGetDashboardQueryKey, getGetMeQueryKey,
  type Crop, type CropInput, type CropUpdate,
} from "@workspace/api-client-react";
import { Plus, Sprout, Trash2, Pencil, Wheat, Maximize, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = ["planned", "planted", "growing", "harvested"] as const;

const statusColors: Record<string, string> = {
  planned: "bg-gray-100 text-gray-700",
  planted: "bg-blue-100 text-blue-800",
  growing: "bg-green-100 text-green-800",
  harvested: "bg-amber-100 text-amber-800",
};

function emptyForm() {
  return {
    cropType: "", variety: "", season: "", status: "planned",
    acreage: "", expectedYield: "", actualYield: "", yieldUnit: "bushels",
    plantingDate: "", harvestDate: "", notes: "",
  };
}

export default function CropsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const isAdmin = me?.role !== "employee";

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  const { data: crops = [], isLoading } = useListCrops({
    query: { queryKey: getListCropsQueryKey() },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListCropsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
  };

  const createCrop = useCreateCrop({
    mutation: {
      onSuccess: () => { invalidate(); closeModal(); toast({ title: "Crop planting added" }); },
      onError: () => toast({ title: "Failed to add crop", variant: "destructive" }),
    },
  });

  const updateCrop = useUpdateCrop({
    mutation: {
      onSuccess: () => { invalidate(); closeModal(); toast({ title: "Crop updated" }); },
      onError: () => toast({ title: "Failed to update crop", variant: "destructive" }),
    },
  });

  const deleteCrop = useDeleteCrop({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Crop removed" }); },
    },
  });

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  }

  function openEdit(crop: Crop) {
    setEditingId(crop.id);
    setForm({
      cropType: crop.cropType,
      variety: crop.variety ?? "",
      season: crop.season ?? "",
      status: crop.status,
      acreage: crop.acreage != null ? String(crop.acreage) : "",
      expectedYield: crop.expectedYield != null ? String(crop.expectedYield) : "",
      actualYield: crop.actualYield != null ? String(crop.actualYield) : "",
      yieldUnit: crop.yieldUnit,
      plantingDate: crop.plantingDate ?? "",
      harvestDate: crop.harvestDate ?? "",
      notes: crop.notes ?? "",
    });
    setShowModal(true);
  }

  function num(v: string): number | undefined {
    if (v.trim() === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  function handleSubmit() {
    if (!form.cropType.trim()) {
      toast({ title: "Crop type is required", variant: "destructive" });
      return;
    }
    if (editingId != null) {
      const data: CropUpdate = {
        cropType: form.cropType,
        variety: form.variety || null,
        season: form.season || null,
        status: form.status as CropUpdate["status"],
        acreage: num(form.acreage) ?? null,
        expectedYield: num(form.expectedYield) ?? null,
        actualYield: num(form.actualYield) ?? null,
        yieldUnit: form.yieldUnit || undefined,
        plantingDate: form.plantingDate || null,
        harvestDate: form.harvestDate || null,
        notes: form.notes || null,
      };
      updateCrop.mutate({ id: editingId, data });
    } else {
      const data: CropInput = {
        cropType: form.cropType,
        variety: form.variety || undefined,
        season: form.season || undefined,
        status: form.status as CropInput["status"],
        acreage: num(form.acreage),
        expectedYield: num(form.expectedYield),
        actualYield: num(form.actualYield),
        yieldUnit: form.yieldUnit || undefined,
        plantingDate: form.plantingDate || undefined,
        harvestDate: form.harvestDate || undefined,
        notes: form.notes || undefined,
      };
      createCrop.mutate({ data });
    }
  }

  const active = crops.filter(c => c.status !== "harvested");
  const totalAcres = active.reduce((s, c) => s + (c.acreage ?? 0), 0);
  const expected = active.reduce((s, c) => s + (c.expectedYield ?? 0), 0);

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Crops</h1>
          <p className="text-sm text-muted-foreground">Track plantings, growth, and harvest yields</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} data-testid="button-add-crop">
            <Plus size={15} className="mr-1.5" />
            Add Crop Planting
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Plantings", value: active.length, icon: Sprout, color: "border-green-500" },
          { label: "Acres Planted", value: totalAcres.toLocaleString(), icon: Maximize, color: "border-emerald-500" },
          { label: "Expected Yield", value: expected.toLocaleString(), icon: TrendingUp, color: "border-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="overflow-hidden" data-testid={`crop-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-0">
              <div className={`flex items-center gap-3 p-4 border-l-4 ${color}`}>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
                <Icon size={18} className="text-muted-foreground ml-auto" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : crops.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wheat size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No crop plantings yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {crops.map(crop => (
            <Card key={crop.id} data-testid={`crop-card-${crop.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wheat size={16} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm" data-testid={`crop-name-${crop.id}`}>
                          {crop.cropType}{crop.variety ? ` — ${crop.variety}` : ""}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColors[crop.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {crop.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {crop.season && <span>{crop.season}</span>}
                        {crop.acreage != null && <span>{crop.acreage} acres</span>}
                        {crop.expectedYield != null && <span>Est. {crop.expectedYield} {crop.yieldUnit}</span>}
                        {crop.actualYield != null && <span>Actual {crop.actualYield} {crop.yieldUnit}</span>}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(crop)}
                        data-testid={`button-edit-crop-${crop.id}`}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteCrop.mutate({ id: crop.id })}
                        data-testid={`button-delete-crop-${crop.id}`}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); else setShowModal(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId != null ? "Edit Crop" : "Add Crop Planting"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Crop Type *</Label>
                <Input value={form.cropType} onChange={e => setForm({ ...form, cropType: e.target.value })} placeholder="e.g. Corn" data-testid="input-crop-type" />
              </div>
              <div>
                <Label>Variety</Label>
                <Input value={form.variety} onChange={e => setForm({ ...form, variety: e.target.value })} placeholder="e.g. Pioneer P1234" data-testid="input-crop-variety" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Season</Label>
                <Input value={form.season} onChange={e => setForm({ ...form, season: e.target.value })} placeholder="e.g. 2026" data-testid="input-crop-season" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="select-crop-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Acreage</Label>
                <Input type="number" value={form.acreage} onChange={e => setForm({ ...form, acreage: e.target.value })} placeholder="120" data-testid="input-crop-acreage" />
              </div>
              <div>
                <Label>Yield Unit</Label>
                <Input value={form.yieldUnit} onChange={e => setForm({ ...form, yieldUnit: e.target.value })} placeholder="bushels" data-testid="input-crop-yield-unit" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Expected Yield</Label>
                <Input type="number" value={form.expectedYield} onChange={e => setForm({ ...form, expectedYield: e.target.value })} placeholder="18000" data-testid="input-crop-expected-yield" />
              </div>
              <div>
                <Label>Actual Yield</Label>
                <Input type="number" value={form.actualYield} onChange={e => setForm({ ...form, actualYield: e.target.value })} placeholder="0" data-testid="input-crop-actual-yield" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Planting Date</Label>
                <Input type="date" value={form.plantingDate} onChange={e => setForm({ ...form, plantingDate: e.target.value })} data-testid="input-crop-planting-date" />
              </div>
              <div>
                <Label>Harvest Date</Label>
                <Input type="date" value={form.harvestDate} onChange={e => setForm({ ...form, harvestDate: e.target.value })} data-testid="input-crop-harvest-date" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional" data-testid="input-crop-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createCrop.isPending || updateCrop.isPending} data-testid="button-submit-crop">
              {editingId != null
                ? (updateCrop.isPending ? "Saving..." : "Save Changes")
                : (createCrop.isPending ? "Adding..." : "Add Crop")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
