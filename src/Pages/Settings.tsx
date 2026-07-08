// src/Pages/Settings.tsx
import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ModeToggle } from "@/components/shared/mode-toggle";

import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/lib/auth";
import { useManagementApi } from "@/lib/management-api";
import { useAccountApi, type AccountProfile } from "@/lib/account-api";
import type { Department, Location, Supplier } from "@/types";
import {
  SuppliersTab,
  DepartmentsTab,
  LocationsTab,
} from "@/Pages/components/EmployeePageTabs";

// ─── Account section ──────────────────────────────────────────────────────────
function AccountSettings() {
  const { getMe, updateProfile, changePassword } = useAccountApi();

  const [profile, setProfile] = React.useState<AccountProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [savingProfile, setSavingProfile] = React.useState(false);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [changingPassword, setChangingPassword] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    getMe()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
      })
      .catch((err) => {
        toast.error("Failed to load profile", {
          description: err instanceof Error ? err.message : undefined,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = React.useCallback(async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setProfile(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Failed to update profile", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingProfile(false);
    }
  }, [firstName, lastName, updateProfile]);

  const submitPasswordChange = React.useCallback(async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Enter your current and new password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (err) {
      toast.error("Failed to change password", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword, changePassword]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading account…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>First name</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={savingProfile}
              />
            </div>
            <div className="space-y-1">
              <Label>Last name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={savingProfile}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={profile?.email ?? ""} disabled />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={profile?.location ?? "—"} disabled />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Input value={profile?.department ?? "—"} disabled />
            </div>
          </div>
          <Button onClick={saveProfile} disabled={savingProfile} type="button">
            {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Current password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={changingPassword}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1">
            <Label>New password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={changingPassword}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <Label>Confirm new password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={changingPassword}
              autoComplete="new-password"
            />
          </div>
          <Button
            onClick={submitPasswordChange}
            disabled={changingPassword}
            type="button"
          >
            {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Change Password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Choose light, dark, or match your system.</p>
          <ModeToggle />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Master data section (admin only) ─────────────────────────────────────────
type DeleteTarget = {
  type: "department" | "location" | "supplier";
  id: number;
  label: string;
};

function MasterDataSettings() {
  const { isLoaded, isSignedIn } = useAuth();
  const api = useManagementApi();

  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(null);

  const apiRef = React.useRef(api);
  React.useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const loadAllData = React.useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRef.current.loadAll();
      setDepartments(data.departments);
      setLocations(data.locations);
      setSuppliers(data.suppliers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  React.useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    try {
      if (type === "department") {
        await apiRef.current.deleteDepartment(id);
        setDepartments((p) => p.filter((x) => x.id !== id));
      } else if (type === "location") {
        await apiRef.current.deleteLocation(id);
        setLocations((p) => p.filter((x) => x.id !== id));
      } else if (type === "supplier") {
        await apiRef.current.deleteSupplier(id);
        setSuppliers((p) => p.filter((x) => x.id !== id));
      }
      setDeleteTarget(null);
      toast.success(`${type[0].toUpperCase()}${type.slice(1)} deleted`);
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Delete failed",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Master Data</h2>
        <p className="text-sm text-muted-foreground">
          Manage Suppliers, Departments, and Locations used across the app.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          <span className="flex-1">{error}</span>
          <button
            onClick={loadAllData}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <SuppliersTab
          suppliers={suppliers}
          setSuppliers={setSuppliers}
          loading={loading}
          onDelete={(id, label) => setDeleteTarget({ type: "supplier", id, label })}
        />

        <DepartmentsTab
          departments={departments}
          setDepartments={setDepartments}
          locations={locations}
          loading={loading}
          onDelete={(id, label) => setDeleteTarget({ type: "department", id, label })}
        />

        <LocationsTab
          locations={locations}
          setLocations={setLocations}
          loading={loading}
          onDelete={(id, label) => setDeleteTarget({ type: "location", id, label })}
        />
      </Tabs>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently remove "${deleteTarget.label}". This action cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} type="button">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { isAdmin } = usePermissions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and application preferences.
        </p>
      </div>

      <AccountSettings />

      {isAdmin && (
        <>
          <Separator />
          <MasterDataSettings />
        </>
      )}
    </div>
  );
}
