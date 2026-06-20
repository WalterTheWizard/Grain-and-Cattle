import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInputs, useCreateInput, useUpdateInput, useDeleteInput,
  useGetMe, getListInputsQueryKey,
  useListInputApplications, useAddInputApplication, useDeleteInputApplication,
  getListInputApplicationsQueryKey, getGetDashboardQueryKey, getGetMeQueryKey,
  type Input as InputItem, type InputInput, type InputUpdate, type InputApplicationInput,
} from "@workspace/api-client-react";
import { Plus, FlaskConical, Trash2, Pencil, Sprout, Package } from "lucide-react";
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

const CATEGORY_OPTIONS = ["seed", "fertilizer", "chemical", "other"] as const;

const categoryColors: Record<string, string> = {
  seed: "bg-green-100 text-green-800",
  fertilizer: "bg-blue-100 text-blue-800",
  chemical: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-700",
};

function emptyForm() {
  return { name: "", category: "seed", unit: "", quantityOnHand: "", costPerUnit: "", supplier: "", notes: "" };
}

function emptyApp() {
  return { date: new Date().toISOString().slice(0, 10), quantity: "", cost: "", notes: "" };
}

export default function InputsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const isAdmin = me?.role !== "employee";

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  const [appFor, setAppFor] = useState<InputItem | null>(null);
  const [appForm, setAppForm] = useState(emptyApp());

  const { data: inputs = [], isLoading } = useListInputs({
    query: { queryKey: getListInputsQueryKey() },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListInputsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
  };

  const createInput = useCreateInput({
    mutation: {
      onSuccess: () => { invalidate(); closeModal(); toast({ title: "Input added" }); },
      onError: () => toast({ title: "Failed to add input", variant: "destructive" }),
    },
  });
  const updateInput = useUpdateInput({
    mutation: {
      onSuccess: () => { invalidate(); closeModal(); toast({ title: "Input updated" }); },
      onError: () => toast({ title: "Failed to update input", variant: "destructive" }),
    },
  });
  const deleteInput = useDeleteInput({
    mutation: { onSuccess: () => { invalidate(); toast({ title: "Input removed" }); } },
  });

  const { data: applications = [], isLoading: appsLoading } = useListInputApplications(appFor?.id ?? 0, {
    query: {
      enabled: appFor != null,
      queryKey: getListInputApplicationsQueryKey(appFor?.id ?? 0),
    },
  });

  const addApp = useAddInputApplication({
    mutation: {
      onSuccess: () => {
        if (appFor) queryClient.invalidateQueries({ queryKey: getListInputApplicationsQueryKey(appFor.id) });
        invalidate();
        setAppForm(emptyApp());
        toast({ title: "Application recorded" });
      },
      onError: () => toast({ title: "Failed to record application", variant: "destructive" }),
    },
  });
  const deleteApp = useDeleteInputApplication({
    mutation: {
      onSuccess: () => {
        if (appFor) queryClient.invalidateQueries({ queryKey: getListInputApplicationsQueryKey(appFor.id) });
        toast({ title: "Application removed" });
      },
    },
  });

  function closeModal() { setShowModal(false); setEditingId(null); setForm(emptyForm()); }
  function openCreate() { setEditingId(null); setForm(emptyForm()); setShowModal(true); }
  function openEdit(item: InputItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantityOnHand: String(item.quantityOnHand),
      costPerUnit: item.costPerUnit != null ? String(item.costPerUnit) : "",
      supplier: item.supplier ?? "",
      notes: item.notes ?? "",
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
      toast({ title: "Input name is required", variant: "destructive" });
      return;
    }
    if (editingId != null) {
      const data: InputUpdate = {
        name: form.name,
        category: form.category as InputUpdate["category"],
        unit: form.unit || undefined,
        quantityOnHand: num(form.quantityOnHand) ?? 0,
        costPerUnit: num(form.costPerUnit) ?? null,
        supplier: form.supplier || null,
        notes: form.notes || null,
      };
      updateInput.mutate({ id: editingId, data });
    } else {
      const data: InputInput = {
        name: form.name,
        category: form.category as InputInput["category"],
        unit: form.unit || undefined,
        quantityOnHand: num(form.quantityOnHand),
        costPerUnit: num(form.costPerUnit),
        supplier: form.supplier || undefined,
        notes: form.notes || undefined,
      };
      createInput.mutate({ data });
    }
  }

  function handleAddApp() {
    if (!appFor) return;
    const qty = num(appForm.quantity);
    if (!appForm.date || qty == null) {
      toast({ title: "Date and quantity are required", variant: "destructive" });
      return;
    }
    const data: InputApplicationInput = {
      date: appForm.date,
      quantity: qty,
      cost: num(appForm.cost),
      notes: appForm.notes || undefined,
    };
    addApp.mutate({ id: appFor.id, data });
  }

  const lowStock = inputs.filter(i => i.quantityOnHand <= 0).length;

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inputs</h1>
          <p className="text-sm text-muted-foreground">Manage seed, fertilizer, and chemical inventory</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} data-testid="button-add-input">
            <Plus size={15} className="mr-1.5" />
            Add Input
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Inputs", value: inputs.length, icon: FlaskConical, color: "border-green-500" },
          { label: "Categories", value: new Set(inputs.map(i => i.category)).size, icon: Package, color: "border-emerald-500" },
          { label: "Out of Stock", value: lowStock, icon: Sprout, color: "border-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="overflow-hidden" data-testid={`input-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
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
      ) : inputs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FlaskConical size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No inputs yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inputs.map(item => (
            <Card key={item.id} data-testid={`input-card-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <FlaskConical size={16} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm" data-testid={`input-name-${item.id}`}>{item.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${categoryColors[item.category] ?? "bg-gray-100 text-gray-700"}`}>
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{item.quantityOnHand.toLocaleString()} {item.unit} on hand</span>
                        {item.costPerUnit != null && <span>${item.costPerUnit}/{item.unit}</span>}
                        {item.supplier && <span>{item.supplier}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setAppFor(item); setAppForm(emptyApp()); }} data-testid={`button-applications-${item.id}`}>
                      <Sprout size={12} className="mr-1" /> Applications
                    </Button>
                    {isAdmin && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => openEdit(item)} data-testid={`button-edit-input-${item.id}`}>
                          <Pencil size={13} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteInput.mutate({ id: item.id })} data-testid={`button-delete-input-${item.id}`}>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId != null ? "Edit Input" : "Add Input"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Urea 46-0-0" data-testid="input-input-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="select-input-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="e.g. lbs, gal, bags" data-testid="input-input-unit" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity On Hand</Label>
                <Input type="number" value={form.quantityOnHand} onChange={e => setForm({ ...form, quantityOnHand: e.target.value })} placeholder="0" data-testid="input-input-quantity" />
              </div>
              <div>
                <Label>Cost Per Unit</Label>
                <Input type="number" value={form.costPerUnit} onChange={e => setForm({ ...form, costPerUnit: e.target.value })} placeholder="0.00" data-testid="input-input-cost" />
              </div>
            </div>
            <div>
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Optional" data-testid="input-input-supplier" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional" data-testid="input-input-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createInput.isPending || updateInput.isPending} data-testid="button-submit-input">
              {editingId != null
                ? (updateInput.isPending ? "Saving..." : "Save Changes")
                : (createInput.isPending ? "Adding..." : "Add Input")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={appFor != null} onOpenChange={(open) => { if (!open) setAppFor(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Applications — {appFor?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 border-b border-border pb-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={appForm.date} onChange={e => setAppForm({ ...appForm, date: e.target.value })} data-testid="input-app-date" />
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input type="number" value={appForm.quantity} onChange={e => setAppForm({ ...appForm, quantity: e.target.value })} placeholder="0" data-testid="input-app-quantity" />
              </div>
              <div>
                <Label>Cost</Label>
                <Input type="number" value={appForm.cost} onChange={e => setAppForm({ ...appForm, cost: e.target.value })} placeholder="0" data-testid="input-app-cost" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={appForm.notes} onChange={e => setAppForm({ ...appForm, notes: e.target.value })} placeholder="Optional" data-testid="input-app-notes" />
            </div>
            <Button onClick={handleAddApp} disabled={addApp.isPending} size="sm" data-testid="button-submit-app">
              <Plus size={14} className="mr-1" />
              {addApp.isPending ? "Recording..." : "Record Application"}
            </Button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {appsLoading ? (
              <Skeleton className="h-12" />
            ) : applications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No applications recorded yet</p>
            ) : (
              applications.map(app => (
                <div key={app.id} className="flex items-center justify-between bg-muted/40 rounded-md p-2.5" data-testid={`app-row-${app.id}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{app.quantity.toLocaleString()} {appFor?.unit}</span>
                      <span className="text-xs text-muted-foreground">{app.date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {app.cost != null && <span>${app.cost.toLocaleString()}</span>}
                      {app.notes && <span>{app.notes}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteApp.mutate({ id: app.id })} data-testid={`button-delete-app-${app.id}`}>
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
