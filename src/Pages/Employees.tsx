// src/Pages/EmployeesPage.tsx
import * as React from "react";
import { useAuth } from "@clerk/clerk-react";

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

import type { Department, Location, Supplier, Employee } from "@/types";
import {
  EmployeesTab,
  SuppliersTab,
  DepartmentsTab,
  LocationsTab,
} from "@/Pages/components/EmployeePageTabs";
import { useManagementApi } from "@/lib/management-api";

type DeleteTarget = {
  type: "employee" | "department" | "location" | "supplier";
  id: number;
  label: string;
};

export default function EmployeesPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const api = useManagementApi();

  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(
    null,
  );

  // ── Stable ref — avoids re-render loops from unstable api reference ────────
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
      setEmployees(data.employees);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  React.useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    try {
      if (type === "employee") {
        await apiRef.current.deleteEmployee(id);
        setEmployees((p) => p.filter((x) => x.id !== id));
      } else if (type === "department") {
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage Employees, Suppliers, Departments, and Locations.
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

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <EmployeesTab
          employees={employees}
          setEmployees={setEmployees}
          departments={departments}
          locations={locations}
          loading={loading}
          onDelete={(id, label) =>
            setDeleteTarget({ type: "employee", id, label })
          }
        />

        <SuppliersTab
          suppliers={suppliers}
          setSuppliers={setSuppliers}
          loading={loading}
          onDelete={(id, label) =>
            setDeleteTarget({ type: "supplier", id, label })
          }
        />

        <DepartmentsTab
          departments={departments}
          setDepartments={setDepartments}
          locations={locations}
          loading={loading}
          onDelete={(id, label) =>
            setDeleteTarget({ type: "department", id, label })
          }
        />

        <LocationsTab
          locations={locations}
          setLocations={setLocations}
          loading={loading}
          onDelete={(id, label) =>
            setDeleteTarget({ type: "location", id, label })
          }
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
