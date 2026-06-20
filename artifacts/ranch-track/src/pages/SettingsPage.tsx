import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import {
  useGetSettings, useUpdateSettings, useDeleteAccount, useGetMe,
  getGetSettingsQueryKey, getGetMeQueryKey,
} from "@workspace/api-client-react";
import { Settings, Trash2, Info, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { signOut } = useClerk();

  const [farmName, setFarmName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [location, setLocation] = useState("");
  const [dirty, setDirty] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const isOwner = me?.role === "owner";
  const isEmployee = me?.role === "employee";

  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });

  useEffect(() => {
    if (settings) {
      setFarmName(settings.farmName);
      setOwnerName(settings.ownerName);
      setLocation(settings.location ?? "");
      setDirty(false);
    }
  }, [settings]);

  const updateSettings = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setDirty(false);
        toast({ title: "Settings saved" });
      },
      onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
    },
  });

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const deleteAccount = useDeleteAccount({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        // Owners are Clerk-authenticated — sign them out so the session is fully cleared.
        void signOut({ redirectUrl: basePath || "/" });
      },
      onError: () => toast({ title: "Failed to delete account", variant: "destructive" }),
    },
  });

  function handleSave() {
    updateSettings.mutate({
      data: {
        farmName,
        ownerName,
        location: location || undefined,
      },
    });
  }

  function handleDelete() {
    deleteAccount.mutate();
  }

  function markDirty() {
    setDirty(true);
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your farm account and preferences</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings size={16} />
            Profile Settings
          </CardTitle>
          <CardDescription>Update your farm's information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="setting-farm-name">Ranch Name</Label>
            <Input
              id="setting-farm-name"
              value={farmName}
              onChange={e => { setFarmName(e.target.value); markDirty(); }}
              disabled={isEmployee}
              data-testid="input-setting-farm-name"
            />
          </div>
          <div>
            <Label htmlFor="setting-owner-name">Owner Name</Label>
            <Input
              id="setting-owner-name"
              value={ownerName}
              onChange={e => { setOwnerName(e.target.value); markDirty(); }}
              disabled={isEmployee}
              data-testid="input-setting-owner-name"
            />
          </div>
          <div>
            <Label htmlFor="setting-location">
              <MapPin size={13} className="inline mr-1" />
              Farm Location
            </Label>
            <Input
              id="setting-location"
              value={location}
              onChange={e => { setLocation(e.target.value); markDirty(); }}
              placeholder="e.g. Texas, USA"
              disabled={isEmployee}
              data-testid="input-setting-location"
            />
          </div>
          {!isEmployee && (
            <div className="pt-1">
              <Button
                onClick={handleSave}
                disabled={!dirty || updateSettings.isPending}
                data-testid="button-save-settings"
              >
                {updateSettings.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info size={16} />
            System Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Database</span>
            <span className="text-green-600 font-medium">Connected</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Farm ID</span>
            <span className="font-mono">{settings?.farmId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{settings?.email}</span>
          </div>
          <div className="pt-2">
            <Link href="/fields">
              <Button variant="outline" size="sm" data-testid="button-field-management-link">
                <ExternalLink size={13} className="mr-1.5" />
                Go to Field Management
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <Trash2 size={16} />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions — proceed with caution</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Deleting your farm account will permanently remove all cattle records, tasks, fields, and employees associated with your farm, and delete your sign-in identity.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-delete-account"
            >
              <Trash2 size={14} className="mr-1.5" />
              Delete Farm Account
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Farm Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your farm, all associated data, and your sign-in identity. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteAccount.isPending}
              data-testid="button-confirm-delete-account"
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
