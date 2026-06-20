import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListStorageBins, useCreateStorageBin, useUpdateStorageBin, useDeleteStorageBin,
  useGetMe, getListStorageBinsQueryKey, getGetDashboardQueryKey, getGetMeQueryKey,
  type StorageBin, type StorageBinInput, type StorageBinUpdate,
} from "@workspace/api-client-react";
import { Plus, Warehouse, Trash2, Pencil, Droplets, Database } from "lucide-react";
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

const STATUS_OPTIONS = ["active", "maintenance", "empty"] as const;

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  maintenance: "bg-amber-100 text-amber-800",
  empty: "bg-gray-100 text-gray-700",
};

function emptyForm() {
  return {
    name: "", grainType: "", capacity: "", currentQuantity: "",
    moisture: "", location: "", status: "active",
  };
}

export default function StoragePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const isAdmin = me?.role !== "employee";

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  const { data: bins = [], isLoading } = useListStorageBins({
    query: { queryKey: getListStorageBinsQueryKey() },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListStorageBinsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
  };

  const createBin = useCreateStorageBin({
    mutation: {
      onSuccess: () => { invalidate(); closeModal(); toast({ title: "Storage bin added" }); },
      onError: () => toast({ title: "Failed to add bin", variant: "destructive" }),
    },
  });
  const updateBin = useUpdateStorageBin({
    mutation: {
      onSuccess: () => { invalidate(); closeModal(); toast({ title: "Storage bin updated" }); },
      onError: () => toast({ title: "Failed to update bin", variant: "destructive" }),
    },
  });
  const deleteBin = useDeleteStorageBin({
    mutation: { onSuccess: () => { invalidate(); toast({ title: "Storage bin removed" }); } },
  });

  function closeModal() { setShowModal(false); setEditingId(null); setForm(emptyForm()); }
  function openCreate() { setEditingId(null); setForm(emptyForm()); setShowModal(true); }
  function openEdit(bin: StorageBin) {
    setEditingId(bin.id);
    setForm({
      name: bin.name,
      grainType: bin.grainType ?? "",
      capacity: bin.capacity != null ? String(bin.capacity) : "",
      currentQuantity: String(bin.currentQuantity),
      moisture: bin.moisture != null ? String(bin.moisture) : "",
      location: bin.location ?? "",
      status: bin.status,
    });
    setShowModal(true);
  }

  function num(v: string): number | undefined {
    if (v.trim() === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast({ title: "Bin name is required", variant: "destructive" });
      return;
    }
    if (editingId != null) {
      const data: StorageBinUpdate = {
        name: form.name,
        grainType: form.grainType || null,
        capacity: num(form.capacity) ?? null,
        currentQuantity: num(form.currentQuantity) ?? 0,
        moisture: num(form.moisture) ?? null,
        location: form.location || null,
        status: form.status as StorageBinUpdate["status"],
      };
      updateBin.mutate({ id: editingId, data });
    } else {
      const data: StorageBinInput = {
        name: form.name,
        grainType: form.grainType || undefined,
        capacity: num(form.capacity),
        currentQuantity: num(form.currentQuantity),
        moisture: num(form.moisture),
        location: form.location || undefined,
        status: form.status as StorageBinInput["status"],
      };
      createBin.mutate({ data });
    }
  }

  const totalStored = bins.reduce((s, b) => s + (b.currentQuantity ?? 0), 0);
  const totalCapacity = bins.reduce((s, b) => s + (b.capacity ?? 0), 0);
  const pct = totalCapacity > 0 ? Math.round((totalStored / totalCapacity) * 100) : 0;

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grain Storage</h1>
          <p className="text-sm text-muted-foreground">Monitor bin levels, moisture, and capacity</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} data-testid="button-add-bin">
            <Plus size={15} className="mr-1.5" />
            Add Storage Bin
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Bins", value: bins.length, icon: Warehouse, color: "border-green-500" },
          { label: "Total Stored", value: totalStored.toLocaleString(), icon: Database, color: "border-emerald-500" },
          { label: "Capacity Used", value: `${pct}%`, icon: Droplets, color: "border-blue-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="overflow-hidden" data-testid={`storage-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
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
      ) : bins.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Warehouse size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No storage bins yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {bins.map(bin => {
            const fill = bin.capacity && bin.capacity > 0
              ? Math.min(100, Math.round((bin.currentQuantity / bin.capacity) * 100))
              : null;
            return (
              <Card key={bin.id} data-testid={`bin-card-${bin.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm" data-testid={`bin-name-${bin.id}`}>{bin.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColors[bin.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {bin.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {bin.grainType && <span>{bin.grainType}</span>}
                        {bin.location && <span>{bin.location}</span>}
                        {bin.moisture != null && <span>{bin.moisture}% moisture</span>}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => openEdit(bin)} data-testid={`button-edit-bin-${bin.id}`}>
                          <Pencil size={13} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteBin.mutate({ id: bin.id })} data-testid={`button-delete-bin-${bin.id}`}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{bin.currentQuantity.toLocaleString()}{bin.capacity != null ? ` / ${bin.capacity.toLocaleString()}` : ""}</span>
                      {fill != null && <span className="font-medium">{fill}%</span>}
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${fill ?? 0}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); else setShowModal(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId != null ? "Edit Storage Bin" : "Add Storage Bin"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bin 1" data-testid="input-bin-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Grain Type</Label>
                <Input value={form.grainType} onChange={e => setForm({ ...form, grainType: e.target.value })} placeholder="e.g. Corn" data-testid="input-bin-grain-type" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="select-bin-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Capacity</Label>
                <Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="50000" data-testid="input-bin-capacity" />
              </div>
              <div>
                <Label>Current Quantity</Label>
                <Input type="number" value={form.currentQuantity} onChange={e => setForm({ ...form, currentQuantity: e.target.value })} placeholder="0" data-testid="input-bin-current-quantity" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Moisture (%)</Label>
                <Input type="number" value={form.moisture} onChange={e => setForm({ ...form, moisture: e.target.value })} placeholder="14" data-testid="input-bin-moisture" />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="North yard" data-testid="input-bin-location" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createBin.isPending || updateBin.isPending} data-testid="button-submit-bin">
              {editingId != null
                ? (updateBin.isPending ? "Saving..." : "Save Changes")
                : (createBin.isPending ? "Adding..." : "Add Bin")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
