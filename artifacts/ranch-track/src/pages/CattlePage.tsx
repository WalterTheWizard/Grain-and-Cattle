import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  useListCattle, useCreateCattle, useUpdateCattleStatus,
  useGetMe, getListCattleQueryKey, getGetMeQueryKey,
} from "@workspace/api-client-react";
import { Plus, Search, ChevronDown, ChevronRight, Beef, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

function genderColor(gender: string) {
  const map: Record<string, string> = {
    female: "bg-pink-100 text-pink-800",
    male: "bg-blue-100 text-blue-800",
    bull: "bg-orange-100 text-orange-800",
    steer: "bg-gray-100 text-gray-700",
  };
  return map[gender] ?? "bg-gray-100 text-gray-700";
}

function calcAge(birthDate: string | null): string {
  if (!birthDate) return "—";
  const birth = new Date(birthDate);
  const now = new Date();
  const years = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (years === 0) {
    const months = Math.floor((now.getTime() - birth.getTime()) / (30 * 24 * 60 * 60 * 1000));
    return `${months}mo`;
  }
  return `${years}yr`;
}

interface CattleRowProps {
  c: {
    id: number;
    tagNumber: string;
    name?: string | null;
    gender: string;
    breed?: string | null;
    birthDate?: string | null;
    status: string;
  };
}

function CattleRow({ c }: CattleRowProps) {
  return (
    <Link href={`/cattle/${c.id}`}>
      <div
        data-testid={`cattle-row-${c.id}`}
        className="flex items-center px-4 py-3 hover:bg-muted/40 cursor-pointer border-b border-border last:border-0 transition-colors"
      >
        <div className="w-24 font-mono text-sm font-medium">#{c.tagNumber}</div>
        <div className="flex-1 text-sm text-foreground">{c.name || "—"}</div>
        <div className="w-20">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${genderColor(c.gender)}`}>
            {c.gender}
          </span>
        </div>
        <div className="w-28 text-xs text-muted-foreground">{c.breed || "—"}</div>
        <div className="w-16 text-xs text-muted-foreground">{calcAge(c.birthDate ?? null)}</div>
        <div className="w-20">
          <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs">
            {c.status.toUpperCase()}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

export default function CattlePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const isAdmin = me?.role !== "employee";
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [soldOpen, setSoldOpen] = useState(false);
  const [deceasedOpen, setDeceasedOpen] = useState(false);

  const [tagNumber, setTagNumber] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<string>("");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: activeCattle = [], isLoading } = useListCattle(
    { status: "active" },
    { query: { queryKey: getListCattleQueryKey({ status: "active" }) } }
  );
  const { data: soldCattle = [] } = useListCattle(
    { status: "sold" },
    { query: { queryKey: getListCattleQueryKey({ status: "sold" }) } }
  );
  const { data: deceasedCattle = [] } = useListCattle(
    { status: "deceased" },
    { query: { queryKey: getListCattleQueryKey({ status: "deceased" }) } }
  );

  const createCattle = useCreateCattle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCattleQueryKey() });
        setShowModal(false);
        resetForm();
        toast({ title: "Cattle registered successfully" });
      },
      onError: () => toast({ title: "Failed to register cattle", variant: "destructive" }),
    },
  });

  function resetForm() {
    setTagNumber(""); setName(""); setGender(""); setBreed(""); setBirthDate(""); setNotes("");
  }

  function handleSubmit() {
    if (!tagNumber || !gender) {
      toast({ title: "Tag number and gender are required", variant: "destructive" });
      return;
    }
    createCattle.mutate({
      data: { tagNumber, name: name || undefined, gender: gender as "female" | "male" | "bull" | "steer", breed: breed || undefined, birthDate: birthDate || undefined, notes: notes || undefined },
    });
  }

  const filtered = activeCattle.filter(c =>
    c.tagNumber.toLowerCase().includes(search.toLowerCase()) ||
    (c.name && c.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Livestock</h1>
          <p className="text-sm text-muted-foreground">Manage your cattle records</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowModal(true)} data-testid="button-register-cattle">
            <Plus size={15} className="mr-1.5" />
            Register Cattle
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by tag or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-cattle"
          />
        </div>
        <Button variant="outline" size="sm" data-testid="button-filter">
          <Filter size={14} className="mr-1.5" />
          Filter
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center px-4 py-2.5 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground">
          <div className="w-24">Tag #</div>
          <div className="flex-1">Name</div>
          <div className="w-20">Gender</div>
          <div className="w-28">Breed</div>
          <div className="w-16">Age</div>
          <div className="w-20">Status</div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Beef size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search ? "No cattle match your search" : "No active cattle registered"}</p>
          </div>
        ) : (
          filtered.map(c => <CattleRow key={c.id} c={c} />)
        )}
      </div>

      <Collapsible open={soldOpen} onOpenChange={setSoldOpen}>
        <CollapsibleTrigger asChild>
          <button
            data-testid="toggle-sold-records"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {soldOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            Sold Records ({soldCattle.length})
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 bg-card border border-border rounded-lg overflow-hidden">
            {soldCattle.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">No sold records</p>
            ) : (
              soldCattle.map(c => <CattleRow key={c.id} c={c} />)
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={deceasedOpen} onOpenChange={setDeceasedOpen}>
        <CollapsibleTrigger asChild>
          <button
            data-testid="toggle-deceased-records"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {deceasedOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            Deceased Records ({deceasedCattle.length})
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 bg-card border border-border rounded-lg overflow-hidden">
            {deceasedCattle.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">No deceased records</p>
            ) : (
              deceasedCattle.map(c => <CattleRow key={c.id} c={c} />)
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Cattle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tag Number *</Label>
                <Input value={tagNumber} onChange={e => setTagNumber(e.target.value)} placeholder="e.g. A001" data-testid="input-tag-number" />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Optional" data-testid="input-cattle-name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gender *</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger data-testid="select-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="bull">Bull</SelectItem>
                    <SelectItem value="steer">Steer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Breed</Label>
                <Input value={breed} onChange={e => setBreed(e.target.value)} placeholder="e.g. Angus" data-testid="input-breed" />
              </div>
            </div>
            <div>
              <Label>Birth Date</Label>
              <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} data-testid="input-birth-date" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." data-testid="input-notes" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createCattle.isPending} data-testid="button-submit-cattle">
              {createCattle.isPending ? "Registering..." : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
