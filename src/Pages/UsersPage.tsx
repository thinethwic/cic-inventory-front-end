import * as React from "react";
import { toast } from "sonner";
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
import UserManagementTab from "@/components/UserManagementTab";
import { useManagementApi } from "@/lib/management-api";
import type { Department, InventoryUser, Location } from "@/types";

type DeleteTarget = {
  id: number;
  label: string;
};

export default function UsersPage() {
  const api = useManagementApi();
  const [users, setUsers] = React.useState<InventoryUser[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(
    null,
  );

  const apiRef = React.useRef(api);
  React.useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRef.current.loadUserManagement();
      setUsers(data.users);
      setDepartments(data.departments);
      setLocations(data.locations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiRef.current.deleteUser(deleteTarget.id);
      setUsers((current) =>
        current.filter((user) => user.id !== deleteTarget.id),
      );
      toast.success("User deleted", { description: deleteTarget.label });
      setDeleteTarget(null);
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Delete failed",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Admin-only user account creation, access control, and credential
          management.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          <span className="flex-1">{error}</span>
          <button
            onClick={() => void loadData()}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      <UserManagementTab
        users={users}
        setUsers={setUsers}
        departments={departments}
        locations={locations}
        loading={loading}
        onDelete={(id, label) => setDeleteTarget({ id, label })}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
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
