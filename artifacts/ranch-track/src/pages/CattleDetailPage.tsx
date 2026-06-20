import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCattle, useUpdateCattle, useDeleteCattle, useUpdateCattleStatus,
  useListWeights, useAddWeight, useListHealthRecords, useAddHealthRecord,
  useGetMe, getGetCattleQueryKey, getListWeightsQueryKey, getListHealthRecordsQueryKey,
  getListCattleQueryKey, getGetMeQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, Edit2, Trash2, Check, X, Weight, Heart, Beef } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CattleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id!, 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [editTag, setEditTag] = useState("");
  const [editName, setEditName] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBreed, setEditBreed] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState<"sold" | "deceased" | null>(null);

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightValue, setWeightValue] = useState("");
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split("T")[0]);
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [weightNotes, setWeightNotes] = useState("");

  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthType, setHealthType] = useState("");
  const [healthDesc, setHealthDesc] = useState("");
  const [healthDate, setHealthDate] = useState(new Date().toISOString().split("T")[0]);
  const [healthNotes, setHealthNotes] = useState("");

  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const isAdmin = me?.role !== "employee";

  const { data: cattle, isLoading } = useGetCattle(id, {
    query: { queryKey: getGetCattleQueryKey(id), enabled: !!id },
  });
  const { data: weights = [] } = useListWeights(id, {
    query: { queryKey: getListWeightsQueryKey(id), enabled: !!id },
  });
  const { data: healthRecords = [] } = useListHealthRecords(id, {
    query: { queryKey: getListHealthRecordsQueryKey(id), enabled: !!id },
  });

  const updateCattle = useUpdateCattle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCattleQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        setEditing(false);
        toast({ title: "Cattle updated" });
      },
    },
  });

  const deleteCattle = useDeleteCattle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        setLocation("/cattle");
        toast({ title: "Cattle deleted" });
      },
    },
  });

  const updateStatus = useUpdateCattleStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCattleQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        setShowStatusDialog(null);
        toast({ title: "Status updated" });
      },
    },
  });

  const addWeight = useAddWeight({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWeightsQueryKey(id) });
        setShowWeightModal(false);
        setWeightValue(""); setWeightNotes("");
        toast({ title: "Weight recorded" });
      },
    },
  });

  const addHealth = useAddHealthRecord({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHealthRecordsQueryKey(id) });
        setShowHealthModal(false);
        setHealthType(""); setHealthDesc(""); setHealthNotes("");
        toast({ title: "Health record added" });
      },
    },
  });

  function startEdit() {
    if (!cattle) return;
    setEditTag(cattle.tagNumber);
    setEditName(cattle.name ?? "");
    setEditGender(cattle.gender);
    setEditBreed(cattle.breed ?? "");
    setEditBirthDate(cattle.birthDate ?? "");
    setEditNotes(cattle.notes ?? "");
    setEditing(true);
  }

  function saveEdit() {
    updateCattle.mutate({
      id,
      data: {
        tagNumber: editTag,
        name: editName || null,
        gender: editGender,
        breed: editBreed || null,
        birthDate: editBirthDate || null,
        notes: editNotes || null,
      },
    });
  }

  function calcAge(birthDate: string | null) {
    if (!birthDate) return "Unknown";
    const birth = new Date(birthDate);
    const now = new Date();
    const years = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return years === 0 ? "< 1 year" : `${years} year${years > 1 ? "s" : ""}`;
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!cattle) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Cattle not found</p>
        <Link href="/cattle"><Button variant="link">← Back</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/cattle">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft size={15} className="mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Beef size={18} className="text-primary" />
              </div>
              {editing ? (
                <div>
                  <Input value={editTag} onChange={e => setEditTag(e.target.value)} className="font-mono text-lg h-8 w-32" data-testid="input-edit-tag" />
                </div>
              ) : (
                <div>
                  <h1 className="text-xl font-bold">Tag #{cattle.tagNumber}</h1>
                  {cattle.name && <p className="text-sm text-muted-foreground">{cattle.name}</p>}
                </div>
              )}
              <Badge
                data-testid="badge-status"
                className={cattle.status === "active" ? "bg-green-100 text-green-800 border-green-200" : ""}
              >
                {cattle.status.toUpperCase()}
              </Badge>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Button size="sm" onClick={saveEdit} disabled={updateCattle.isPending} data-testid="button-save-edit">
                      <Check size={14} className="mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)} data-testid="button-cancel-edit">
                      <X size={14} />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={startEdit} data-testid="button-edit">
                      <Edit2 size={14} className="mr-1" />
                      Edit
                    </Button>
                    {cattle.status === "active" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setShowStatusDialog("sold")} data-testid="button-mark-sold">
                          Mark Sold
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowStatusDialog("deceased")} data-testid="button-mark-deceased">
                          Mark Deceased
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)} data-testid="button-delete">
                      <Trash2 size={14} />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Tag", value: editing ? <Input value={editTag} onChange={e => setEditTag(e.target.value)} className="h-7 text-sm" /> : `#${cattle.tagNumber}` },
              {
                label: "Gender", value: editing ? (
                  <Select value={editGender} onValueChange={setEditGender}>
                    <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="bull">Bull</SelectItem>
                      <SelectItem value="steer">Steer</SelectItem>
                    </SelectContent>
                  </Select>
                ) : cattle.gender
              },
              { label: "Breed", value: editing ? <Input value={editBreed} onChange={e => setEditBreed(e.target.value)} className="h-7 text-sm" /> : (cattle.breed || "—") },
              { label: "Birth Date", value: editing ? <Input type="date" value={editBirthDate} onChange={e => setEditBirthDate(e.target.value)} className="h-7 text-sm" /> : (cattle.birthDate ? `${cattle.birthDate} (${calcAge(cattle.birthDate)})` : "—") },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="weights" data-testid="tab-weights">Weights ({weights.length})</TabsTrigger>
          <TabsTrigger value="health" data-testid="tab-health">Health Records ({healthRecords.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3">Lineage</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Mother</p>
                  {cattle.motherTag ? (
                    <p className="text-sm font-medium text-primary">Tag #{cattle.motherTag}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Calves</p>
                  {cattle.calves && cattle.calves.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {cattle.calves.map(calf => (
                        <Link key={calf.id} href={`/cattle/${calf.id}`}>
                          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded cursor-pointer hover:bg-primary/20">
                            #{calf.tagNumber}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No calves recorded</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {editing && (
            <Card>
              <CardContent className="p-5">
                <Label>Notes</Label>
                <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className="mt-1" data-testid="input-edit-notes" />
              </CardContent>
            </Card>
          )}

          {!editing && cattle.notes && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{cattle.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="weights" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Weight History</h3>
                {isAdmin && (
                  <Button size="sm" onClick={() => setShowWeightModal(true)} data-testid="button-add-weight">
                    <Weight size={14} className="mr-1" />
                    Add Weight
                  </Button>
                )}
              </div>
              {weights.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No weight records</p>
              ) : (
                <div className="space-y-2">
                  {weights.map(w => (
                    <div key={w.id} data-testid={`weight-row-${w.id}`} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                      <div>
                        <p className="font-medium text-sm">{w.weight} {w.unit}</p>
                        <p className="text-xs text-muted-foreground">{w.notes || "—"}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{w.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Health Records</h3>
                {isAdmin && (
                  <Button size="sm" onClick={() => setShowHealthModal(true)} data-testid="button-add-health">
                    <Heart size={14} className="mr-1" />
                    Add Record
                  </Button>
                )}
              </div>
              {healthRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No health records</p>
              ) : (
                <div className="space-y-2">
                  {healthRecords.map(r => (
                    <div key={r.id} data-testid={`health-row-${r.id}`} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                      <div>
                        <p className="font-medium text-sm capitalize">{r.type}</p>
                        <p className="text-xs text-muted-foreground">{r.description || r.notes || "—"}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showWeightModal} onOpenChange={setShowWeightModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Weight Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Weight *</Label>
                <Input type="number" value={weightValue} onChange={e => setWeightValue(e.target.value)} placeholder="0" data-testid="input-weight-value" />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={weightUnit} onValueChange={setWeightUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lbs">lbs</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={weightDate} onChange={e => setWeightDate(e.target.value)} data-testid="input-weight-date" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={weightNotes} onChange={e => setWeightNotes(e.target.value)} placeholder="Optional" data-testid="input-weight-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWeightModal(false)}>Cancel</Button>
            <Button
              onClick={() => addWeight.mutate({ id, data: { weight: parseFloat(weightValue), unit: weightUnit, date: weightDate, notes: weightNotes || undefined } })}
              disabled={addWeight.isPending || !weightValue}
              data-testid="button-submit-weight"
            >
              {addWeight.isPending ? "Saving..." : "Add Weight"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHealthModal} onOpenChange={setShowHealthModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Health Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type *</Label>
              <Input value={healthType} onChange={e => setHealthType(e.target.value)} placeholder="e.g. Vaccination, Treatment, Checkup" data-testid="input-health-type" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={healthDesc} onChange={e => setHealthDesc(e.target.value)} placeholder="Details..." rows={2} data-testid="input-health-desc" />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={healthDate} onChange={e => setHealthDate(e.target.value)} data-testid="input-health-date" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={healthNotes} onChange={e => setHealthNotes(e.target.value)} placeholder="Optional" data-testid="input-health-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHealthModal(false)}>Cancel</Button>
            <Button
              onClick={() => addHealth.mutate({ id, data: { type: healthType, description: healthDesc || undefined, date: healthDate, notes: healthNotes || undefined } })}
              disabled={addHealth.isPending || !healthType}
              data-testid="button-submit-health"
            >
              {addHealth.isPending ? "Saving..." : "Add Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cattle Record</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete Tag #{cattle.tagNumber}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteCattle.mutate({ id })} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!showStatusDialog} onOpenChange={(open) => !open && setShowStatusDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as {showStatusDialog === "sold" ? "Sold" : "Deceased"}</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the status of Tag #{cattle.tagNumber} to {showStatusDialog}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showStatusDialog && updateStatus.mutate({ id, data: { status: showStatusDialog } })}
              data-testid="button-confirm-status"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
