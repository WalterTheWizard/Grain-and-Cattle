import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEquipment, useCreateEquipment, useUpdateEquipment, useDeleteEquipment,
  useGetMe, getListEquipmentQueryKey,
  useListMaintenanceLogs, useAddMaintenanceLog, useDeleteMaintenanceLog,
  getListMaintenanceLogsQueryKey, getGetDashboardQueryKey, getGetMeQueryKey,
  type Equipment, type EquipmentInput, type EquipmentUpdate, type MaintenanceLogInput,
} from "@workspace/api-client-react";
import { Plus, Tractor, Trash2, Pencil, Wrench, AlertTriangle } from "lucide-react";
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

const TYPE_OPTIONS = ["tractor", "combine", "planter", "sprayer", "truck", "other"] as const;
const STATUS_OPTIONS = ["operational", "maintenance", "repair", "retired"] as const;

const statusColors: Record<string, string> = {
  operational: "bg-green-100 text-green-800",
  maintenance: "bg-amber-100 text-amber-800",
  repair: "bg-red-100 text-red-800",
  retired: "bg-gray-100 text-gray-700",
};

function emptyForm() {
  return {
    name: "", type: "tractor", make: "", model: "", year: "",
    status: "operational", hoursUsed: "", purchaseDate: "", notes: "",
  };
}

function emptyMaint() {
  return { date: new Date().toISOString().slice(0, 10), type: "", description: "", cost: "", hoursAtService: "" };
}

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const isAdmin = me?.role !== "employee";

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  const [maintFor, setMaintFor] = useState<Equipment | null>(null);
  const [maintForm, setMaintForm] = useState(emptyMaint());

  const { data: equipment = [], isLoading } = useListEquipment({
    query: { queryKey: getListEquipmentQueryKey() },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListEquipmentQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
  };

  const createEquipment = useCreateEquipment({
    mutation: {
      onSuccess: () => { invalidate(); closeModal(); toast({ title: "Equipment added" }); },
      onError: () => toast({ title: "Failed to add equipment", variant: "destructive" }),
    },
  });
  const updateEquipment = useUpdateEquipment({
    mutation: {
      onSuccess: () => { invalidate(); closeModal(); toast({ title: "Equipment updated" }); },
      onError: () => toast({ title: "Failed to update equipment", variant: "destructive" }),
    },
  });
  const deleteEquipment = useDeleteEquipment({
    mutation: { onSuccess: () => { invalidate(); toast({ title: "Equipment removed" }); } },
  });

  const { data: logs = [], isLoading: logsLoading } = useListMaintenanceLogs(maintFor?.id ?? 0, {
    query: {
      enabled: maintFor != null,
      queryKey: getListMaintenanceLogsQueryKey(maintFor?.id ?? 0),
    },
  });

  const addLog = useAddMaintenanceLog({
    mutation: {
      onSuccess: () => {
        if (maintFor) queryClient.invalidateQueries({ queryKey: getListMaintenanceLogsQueryKey(maintFor.id) });
        setMaintForm(emptyMaint());
        toast({ title: "Maintenance log added" });
      },
      onError: () => toast({ title: "Failed to add log", variant: "destructive" }),
    },
  });
  const deleteLog = useDeleteMaintenanceLog({
    mutation: {
      onSuccess: () => {
        if (maintFor) queryClient.invalidateQueries({ queryKey: getListMaintenanceLogsQueryKey(maintFor.id) });
        toast({ title: "Log removed" });
      },
    },
  });

  function closeModal() { setShowModal(false); setEditingId(null); setForm(emptyForm()); }
  function openCreate() { setEditingId(null); setForm(emptyForm()); setShowModal(true); }
  function openEdit(eq: Equipment) {
    setEditingId(eq.id);
    setForm({
      name: eq.name,
      type: eq.type,
      make: eq.make ?? "",
      model: eq.model ?? "",
      year: eq.year != null ? String(eq.year) : "",
      status: eq.status,
      hoursUsed: eq.hoursUsed != null ? String(eq.hoursUsed) : "",
      purchaseDate: eq.purchaseDate ?? "",
      notes: eq.notes ?? "",
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
      toast({ title: "Equipment name is required", variant: "destructive" });
      return;
    }
    if (editingId != null) {
      const data: EquipmentUpdate = {
        name: form.name,
        type: form.type as EquipmentUpdate["type"],
        make: form.make || null,
        model: form.model || null,
        year: num(form.year) ?? null,
        status: form.status as EquipmentUpdate["status"],
        hoursUsed: num(form.hoursUsed) ?? null,
        purchaseDate: form.purchaseDate || null,
        notes: form.notes || null,
      };
      updateEquipment.mutate({ id: editingId, data });
    } else {
      const data: EquipmentInput = {
        name: form.name,
        type: form.type as EquipmentInput["type"],
        make: form.make || undefined,
        model: form.model || undefined,
        year: num(form.year),
        status: form.status as EquipmentInput["status"],
        hoursUsed: num(form.hoursUsed),
        purchaseDate: form.purchaseDate || undefined,
        notes: form.notes || undefined,
      };
      createEquipment.mutate({ data });
    }
  }

  function handleAddLog() {
    if (!maintFor) return;
    if (!maintForm.date || !maintForm.type.trim()) {
      toast({ title: "Date and service type are required", variant: "destructive" });
      return;
    }
    const data: MaintenanceLogInput = {
      date: maintForm.date,
      type: maintForm.type,
      description: maintForm.description || undefined,
      cost: num(maintForm.cost),
      hoursAtService: num(maintForm.hoursAtService),
    };
    addLog.mutate({ id: maintFor.id, data });
  }

  const needService = equipment.filter(e => e.status === "maintenance" || e.status === "repair").length;

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipment</h1>
          <p className="text-sm text-muted-foreground">Track machinery and maintenance history</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} data-testid="button-add-equipment">
            <Plus size={15} className="mr-1.5" />
            Add Equipment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Equipment", value: equipment.length, icon: Tractor, color: "border-green-500" },
          { label: "Operational", value: equipment.filter(e => e.status === "operational").length, icon: Wrench, color: "border-emerald-500" },
          { label: "Needs Service", value: needService, icon: AlertTriangle, color: "border-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="overflow-hidden" data-testid={`equipment-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
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
      ) : equipment.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Tractor size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No equipment yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {equipment.map(eq => (
            <Card key={eq.id} data-testid={`equipment-card-${eq.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Tractor size={16} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm" data-testid={`equipment-name-${eq.id}`}>{eq.name}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">{eq.type}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColors[eq.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {eq.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {(eq.make || eq.model) && <span>{[eq.make, eq.model].filter(Boolean).join(" ")}</span>}
                        {eq.year != null && <span>{eq.year}</span>}
                        {eq.hoursUsed != null && <span>{eq.hoursUsed.toLocaleString()} hrs</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setMaintFor(eq); setMaintForm(emptyMaint()); }} data-testid={`button-maintenance-${eq.id}`}>
                      <Wrench size={12} className="mr-1" /> Maintenance
                    </Button>
                    {isAdmin && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => openEdit(eq)} data-testid={`button-edit-equipment-${eq.id}`}>
                          <Pencil size={13} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteEquipment.mutate({ id: eq.id })} data-testid={`button-delete-equipment-${eq.id}`}>
                          <Trash2 size={13} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); else setShowModal(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId != null ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Deere 8R" data-testid="input-equipment-name" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger data-testid="select-equipment-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Make</Label>
                <Input value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} placeholder="John Deere" data-testid="input-equipment-make" />
              </div>
              <div>
                <Label>Model</Label>
                <Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="8R 410" data-testid="input-equipment-model" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Year</Label>
                <Input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="2022" data-testid="input-equipment-year" />
              </div>
              <div>
                <Label>Hours Used</Label>
                <Input type="number" value={form.hoursUsed} onChange={e => setForm({ ...form, hoursUsed: e.target.value })} placeholder="1200" data-testid="input-equipment-hours" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="select-equipment-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} data-testid="input-equipment-purchase-date" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional" data-testid="input-equipment-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createEquipment.isPending || updateEquipment.isPending} data-testid="button-submit-equipment">
              {editingId != null
                ? (updateEquipment.isPending ? "Saving..." : "Save Changes")
                : (createEquipment.isPending ? "Adding..." : "Add Equipment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={maintFor != null} onOpenChange={(open) => { if (!open) setMaintFor(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Maintenance — {maintFor?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 border-b border-border pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={maintForm.date} onChange={e => setMaintForm({ ...maintForm, date: e.target.value })} data-testid="input-maint-date" />
              </div>
              <div>
                <Label>Service Type *</Label>
                <Input value={maintForm.type} onChange={e => setMaintForm({ ...maintForm, type: e.target.value })} placeholder="e.g. Oil change" data-testid="input-maint-type" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cost</Label>
                <Input type="number" value={maintForm.cost} onChange={e => setMaintForm({ ...maintForm, cost: e.target.value })} placeholder="250" data-testid="input-maint-cost" />
              </div>
              <div>
                <Label>Hours At Service</Label>
                <Input type="number" value={maintForm.hoursAtService} onChange={e => setMaintForm({ ...maintForm, hoursAtService: e.target.value })} placeholder="1200" data-testid="input-maint-hours" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={maintForm.description} onChange={e => setMaintForm({ ...maintForm, description: e.target.value })} placeholder="Optional" data-testid="input-maint-description" />
            </div>
            <Button onClick={handleAddLog} disabled={addLog.isPending} size="sm" data-testid="button-submit-maint">
              <Plus size={14} className="mr-1" />
              {addLog.isPending ? "Adding..." : "Add Log"}
            </Button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {logsLoading ? (
              <Skeleton className="h-12" />
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No maintenance logs yet</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex items-center justify-between bg-muted/40 rounded-md p-2.5" data-testid={`maint-log-${log.id}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{log.type}</span>
                      <span className="text-xs text-muted-foreground">{log.date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {log.description && <span>{log.description}</span>}
                      {log.cost != null && <span>${log.cost.toLocaleString()}</span>}
                      {log.hoursAtService != null && <span>{log.hoursAtService.toLocaleString()} hrs</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteLog.mutate({ id: log.id })} data-testid={`button-delete-maint-${log.id}`}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
