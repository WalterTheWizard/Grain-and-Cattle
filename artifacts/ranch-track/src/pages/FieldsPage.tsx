import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFields, useCreateField, useUpdateField, useDeleteField,
  getListFieldsQueryKey,
} from "@workspace/api-client-react";
import { Plus, Map, Layers, CheckCircle2, XCircle, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

let leafletLoaded = false;
let MapContainer: React.ComponentType<{ center: [number, number]; zoom: number; style?: React.CSSProperties; className?: string; children?: React.ReactNode }>;
let TileLayer: React.ComponentType<{ url: string; attribution?: string }>;
let Marker: React.ComponentType<{ position: [number, number]; children?: React.ReactNode }>;
let Popup: React.ComponentType<{ children?: React.ReactNode }>;
let Circle: React.ComponentType<{ center: [number, number]; radius: number; pathOptions?: { color?: string; fillColor?: string; fillOpacity?: number } }>;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    available: "bg-green-100 text-green-800",
    occupied: "bg-blue-100 text-blue-800",
    resting: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function LeafletMap({ fields }: { fields: Array<{ id: number; name: string; latitude?: number | null; longitude?: number | null; color: string; status: string }> }) {
  const [components, setComponents] = useState<{
    MapContainer: typeof MapContainer;
    TileLayer: typeof TileLayer;
    Marker: typeof Marker;
    Popup: typeof Popup;
    Circle: typeof Circle;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([rl, L]) => {
      import("leaflet/dist/leaflet.css").catch(() => {});
      const icon = L.default.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      L.default.Marker.prototype.options.icon = icon;
      setComponents({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        Marker: rl.Marker,
        Popup: rl.Popup,
        Circle: rl.Circle,
      });
    }).catch(console.error);
  }, []);

  if (!components) {
    return (
      <div className="w-full h-64 bg-muted/30 rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  const { MapContainer: MC, TileLayer: TL, Marker: Mk, Popup: Pp, Circle: Ci } = components;
  const center: [number, number] = [39.5, -98.35];
  const fieldsWithCoords = fields.filter(f => f.latitude != null && f.longitude != null);

  return (
    <MC center={center} zoom={4} style={{ height: "300px", width: "100%" }} className="rounded-lg overflow-hidden border border-border">
      <TL
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {fieldsWithCoords.map(f => (
        <Mk key={f.id} position={[f.latitude!, f.longitude!]}>
          <Pp>
            <div>
              <p className="font-medium">{f.name}</p>
              <p className="text-xs capitalize">{f.status}</p>
            </div>
          </Pp>
        </Mk>
      ))}
    </MC>
  );
}

export default function FieldsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<number | null>(null);
  const [fieldName, setFieldName] = useState("");
  const [fieldDesc, setFieldDesc] = useState("");
  const [fieldArea, setFieldArea] = useState("");
  const [fieldStatus, setFieldStatus] = useState<string>("available");
  const [fieldLat, setFieldLat] = useState("");
  const [fieldLng, setFieldLng] = useState("");
  const [fieldColor, setFieldColor] = useState("#22c55e");

  const { data: fields = [], isLoading } = useListFields({
    query: { queryKey: getListFieldsQueryKey() },
  });

  const createField = useCreateField({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFieldsQueryKey() });
        setShowModal(false);
        resetForm();
        toast({ title: "Field added" });
      },
    },
  });

  const updateField = useUpdateField({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFieldsQueryKey() });
        setShowModal(false);
        setEditingField(null);
        resetForm();
        toast({ title: "Field updated" });
      },
    },
  });

  const deleteField = useDeleteField({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFieldsQueryKey() });
        toast({ title: "Field deleted" });
      },
    },
  });

  function resetForm() {
    setFieldName(""); setFieldDesc(""); setFieldArea(""); setFieldStatus("available");
    setFieldLat(""); setFieldLng(""); setFieldColor("#22c55e");
  }

  function openEditModal(f: { id: number; name: string; description?: string | null; area?: number | null; status: string; latitude?: number | null; longitude?: number | null; color: string }) {
    setEditingField(f.id);
    setFieldName(f.name);
    setFieldDesc(f.description ?? "");
    setFieldArea(f.area?.toString() ?? "");
    setFieldStatus(f.status);
    setFieldLat(f.latitude?.toString() ?? "");
    setFieldLng(f.longitude?.toString() ?? "");
    setFieldColor(f.color);
    setShowModal(true);
  }

  function handleSubmit() {
    if (!fieldName) return;
    const data = {
      name: fieldName,
      description: fieldDesc || undefined,
      area: fieldArea ? parseFloat(fieldArea) : undefined,
      status: fieldStatus as "available" | "occupied" | "resting",
      latitude: fieldLat ? parseFloat(fieldLat) : undefined,
      longitude: fieldLng ? parseFloat(fieldLng) : undefined,
      color: fieldColor,
    };
    if (editingField) {
      updateField.mutate({ id: editingField, data });
    } else {
      createField.mutate({ data });
    }
  }

  const totalAcreage = fields.reduce((sum, f) => sum + (f.area ?? 0), 0);
  const occupied = fields.filter(f => f.status === "occupied").length;
  const available = fields.filter(f => f.status === "available").length;

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Field Management</h1>
          <p className="text-sm text-muted-foreground">Manage your pastures and fields</p>
        </div>
        <Button onClick={() => { setEditingField(null); resetForm(); setShowModal(true); }} data-testid="button-add-field">
          <Plus size={15} className="mr-1.5" />
          Add Field
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Fields", value: fields.length, icon: Map, color: "border-green-500" },
          { label: "Total Acreage", value: totalAcreage.toFixed(1), icon: Layers, color: "border-blue-500" },
          { label: "Occupied", value: occupied, icon: CheckCircle2, color: "border-orange-500" },
          { label: "Available", value: available, icon: XCircle, color: "border-teal-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="overflow-hidden" data-testid={`field-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
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

      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3 text-sm">Field Map</h2>
          <LeafletMap fields={fields.map(f => ({ ...f, color: f.color ?? "#22c55e" }))} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="font-semibold text-sm">Field List</h2>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
        ) : fields.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Map size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No fields registered</p>
          </div>
        ) : (
          fields.map(f => (
            <Card key={f.id} data-testid={`field-row-${f.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: f.color }}
                    />
                    <div>
                      <p className="font-medium text-sm">{f.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={f.status} />
                        {f.area && <span className="text-xs text-muted-foreground">{f.area} acres</span>}
                        {f.description && <span className="text-xs text-muted-foreground">{f.description}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditModal({ ...f, color: f.color ?? "#22c55e" })} data-testid={`button-edit-field-${f.id}`}>
                      <Edit2 size={13} />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteField.mutate({ id: f.id })} data-testid={`button-delete-field-${f.id}`}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) { resetForm(); setEditingField(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit Field" : "Add Field"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Field Name *</Label>
                <Input value={fieldName} onChange={e => setFieldName(e.target.value)} placeholder="e.g. North Pasture" data-testid="input-field-name" />
              </div>
              <div>
                <Label>Area (acres)</Label>
                <Input type="number" value={fieldArea} onChange={e => setFieldArea(e.target.value)} placeholder="0" data-testid="input-field-area" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={fieldDesc} onChange={e => setFieldDesc(e.target.value)} placeholder="Optional description..." rows={2} data-testid="input-field-desc" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={fieldStatus} onValueChange={setFieldStatus}>
                <SelectTrigger data-testid="select-field-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="resting">Resting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitude</Label>
                <Input type="number" value={fieldLat} onChange={e => setFieldLat(e.target.value)} placeholder="e.g. 39.5" data-testid="input-field-lat" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input type="number" value={fieldLng} onChange={e => setFieldLng(e.target.value)} placeholder="e.g. -98.3" data-testid="input-field-lng" />
              </div>
            </div>
            <div>
              <Label>Map Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={fieldColor} onChange={e => setFieldColor(e.target.value)} className="h-9 w-16 cursor-pointer rounded border border-border" data-testid="input-field-color" />
                <span className="text-sm text-muted-foreground">{fieldColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); setEditingField(null); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createField.isPending || updateField.isPending || !fieldName} data-testid="button-submit-field">
              {createField.isPending || updateField.isPending ? "Saving..." : (editingField ? "Save Changes" : "Add Field")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
