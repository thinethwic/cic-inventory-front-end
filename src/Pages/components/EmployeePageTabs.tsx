// src/Pages/components/EmployeePageTabs.tsx
import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  MapPin,
  Building2,
  Search,
  Check,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import type { Department, Location, Supplier, Employee } from "@/types";
import {
  useManagementApi,
  type EmployeePayload,
  type DepartmentPayload,
  type LocationPayload,
  type SupplierPayload,
} from "@/lib/management-api";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

// ─── Shared ───────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground">{children}</div>;
}

function ActionMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" type="button" aria-label="Actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </TableCell>
    </TableRow>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="py-10 text-center text-muted-foreground"
      >
        {text}
      </TableCell>
    </TableRow>
  );
}

// ─── Pagination Controls ──────────────────────────────────────────────────────
interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}

const PaginationControls = React.memo(function PaginationControls({
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const handleSizeChange = React.useCallback(
    (v: string) => {
      onPageSizeChange(Number(v));
      onPageChange(1);
    },
    [onPageSizeChange, onPageChange],
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={handleSizeChange}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[90px] text-center text-sm text-muted-foreground">
            Page {page} of {safeTotalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= safeTotalPages}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            type="button"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={page >= safeTotalPages}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

// ─── usePagination hook ───────────────────────────────────────────────────────
function usePagination<T>(items: T[], resetDeps: React.DependencyList) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);

  // Reset to page 1 whenever filters/search change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    setPage(1);
  }, resetDeps);

  const totalPages = Math.max(Math.ceil(items.length / pageSize), 1);
  const paged = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, pageSize, setPageSize, totalPages, paged };
}

// ─── Department Combobox ──────────────────────────────────────────────────────
interface DepartmentComboboxProps {
  departments: Department[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

function DepartmentCombobox({
  departments,
  value,
  onChange,
  disabled,
}: DepartmentComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) =>
      `${d.name} ${d.code}`.toLowerCase().includes(q),
    );
  }, [departments, search]);

  const selected = departments.find((d) => String(d.id) === value);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          type="button"
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {selected.name}
              </span>
              {selected.code && (
                <span className="truncate text-xs text-muted-foreground">
                  · {selected.code}
                </span>
              )}
            </span>
          ) : (
            "Search and select a department..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center border-b px-3 py-2 gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No departments found.
            </div>
          ) : (
            filtered.map((d) => {
              const isSelected = String(d.id) === value;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    onChange(String(d.id));
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                    isSelected && "bg-accent",
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      isSelected ? "opacity-100 text-primary" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {d.name}
                      </span>
                    </div>
                    {d.code && (
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {d.code}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Location Combobox ────────────────────────────────────────────────────────
interface LocationComboboxProps {
  locations: Location[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

function LocationCombobox({
  locations,
  value,
  onChange,
  disabled,
}: LocationComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((l) =>
      `${l.name} ${l.code}`.toLowerCase().includes(q),
    );
  }, [locations, search]);

  const selected = locations.find((l) => String(l.id) === value);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          type="button"
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {selected.name}
              </span>
              {selected.code && (
                <span className="truncate text-xs text-muted-foreground">
                  · {selected.code}
                </span>
              )}
            </span>
          ) : (
            "Search and select a location..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center border-b px-3 py-2 gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No locations found.
            </div>
          ) : (
            filtered.map((l) => {
              const isSelected = String(l.id) === value;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    onChange(String(l.id));
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                    isSelected && "bg-accent",
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      isSelected ? "opacity-100 text-primary" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {l.name}
                      </span>
                    </div>
                    {l.code && (
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {l.code}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── EmployeesTab ─────────────────────────────────────────────────────────────

export interface EmployeesTabProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  departments: Department[];
  locations: Location[];
  loading: boolean;
  onDelete: (id: number, label: string) => void;
}

type EmployeeFormState = {
  empId: string;
  name: string;
  departmentId: string;
  locationId: string;
  phone_no: string;
  email: string;
  employeeStatus: "ACTIVE" | "INACTIVE";
};

export function EmployeesTab({
  employees,
  setEmployees,
  departments,
  locations,
  loading,
  onDelete,
}: EmployeesTabProps) {
  const { createEmployee, updateEmployee } = useManagementApi();

  const [q, setQ] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("All");
  const [locFilter, setLocFilter] = React.useState("All");
  const [statusFilter, setStatusFilter] = React.useState<
    "ACTIVE" | "INACTIVE" | "All"
  >("All");
  const [openForm, setOpenForm] = React.useState(false);
  const [editing, setEditing] = React.useState<Employee | null>(null);
  const [saving, setSaving] = React.useState(false);

  const blankForm = React.useCallback(
    (): EmployeeFormState => ({
      empId: "",
      name: "",
      departmentId: String(departments[0]?.id ?? ""),
      locationId: String(locations[0]?.id ?? ""),
      phone_no: "",
      email: "",
      employeeStatus: "ACTIVE",
    }),
    [departments, locations],
  );

  const [form, setForm] = React.useState<EmployeeFormState>(blankForm);

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    return employees.filter((e) => {
      if (
        t &&
        !`${e.empId} ${e.name} ${e.email ?? ""} ${e.phone_no ?? ""}`
          .toLowerCase()
          .includes(t)
      )
        return false;
      if (deptFilter !== "All" && String(e.department?.id) !== deptFilter)
        return false;
      if (locFilter !== "All" && String(e.location?.id) !== locFilter)
        return false;
      if (statusFilter !== "All" && e.employeeStatus !== statusFilter)
        return false;
      return true;
    });
  }, [employees, q, deptFilter, locFilter, statusFilter]);

  const { page, setPage, pageSize, setPageSize, totalPages, paged } =
    usePagination(filtered, [q, deptFilter, locFilter, statusFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm(blankForm());
    setOpenForm(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({
      empId: e.empId ?? "",
      name: e.name ?? "",
      departmentId: String(e.department?.id ?? ""),
      locationId: String(e.location?.id ?? ""),
      phone_no: e.phone_no ?? "",
      email: e.email ?? "",
      employeeStatus: e.employeeStatus ?? "ACTIVE",
    });
    setOpenForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert("Name is required.");
    if (!form.departmentId) return alert("Department is required.");
    if (!form.locationId) return alert("Location is required.");

    setSaving(true);
    try {
      const payload: EmployeePayload = {
        empId: form.empId,
        name: form.name,
        department: { id: Number(form.departmentId) },
        location: { id: Number(form.locationId) },
        phone_no: form.phone_no,
        email: form.email,
        employeeStatus: form.employeeStatus,
      };

      if (editing) {
        const updated = await updateEmployee(editing.id, payload);
        setEmployees((p) => p.map((x) => (x.id === editing.id ? updated : x)));
      } else {
        const created = await createEmployee(payload);
        setEmployees((p) => [created, ...p]);
      }

      setOpenForm(false);
      setEditing(null);
      setForm(blankForm());
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const f = <K extends keyof EmployeeFormState>(
    k: K,
    v: EmployeeFormState[K],
  ) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <TabsContent value="employees" className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Employees</CardTitle>
              <FieldLabel>Employees used for asset assignment</FieldLabel>
            </div>
            <Button
              onClick={openAdd}
              className="gap-2"
              type="button"
              disabled={loading}
            >
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="emp id, name, email…"
            />
          </div>

          <div className="space-y-1">
            <FieldLabel>Department</FieldLabel>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <FieldLabel>Location</FieldLabel>
            <Select value={locFilter} onValueChange={setLocFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <FieldLabel>Status</FieldLabel>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as "ACTIVE" | "INACTIVE" | "All")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Employee List{" "}
            <span className="text-muted-foreground">
              {loading ? "" : `(${filtered.length})`}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="mx-6 rounded-t-md border-x border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emp ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <LoadingRow colSpan={7} />
                ) : paged.length === 0 ? (
                  <EmptyRow colSpan={7} text="No employees found." />
                ) : (
                  paged.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.empId}</TableCell>
                      <TableCell>{e.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.department?.name ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.location?.name ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div>{e.phone_no || "-"}</div>
                        <div className="text-xs">{e.email || ""}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            e.employeeStatus === "ACTIVE"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {e.employeeStatus === "ACTIVE"
                            ? "Active"
                            : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ActionMenu
                          onEdit={() => openEdit(e)}
                          onDelete={() =>
                            onDelete(e.id, `${e.empId} - ${e.name}`)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mx-6 rounded-b-md border-x border-b">
            <PaginationControls
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={(o) => !saving && setOpenForm(o)}>
        <DialogContent className="flex h-[100dvh] flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>
              {editing ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel>Employee ID</FieldLabel>
                <Input
                  value={editing ? form.empId : "Auto generated by system"}
                  disabled
                  readOnly
                />
              </div>

              <div className="space-y-1">
                <FieldLabel>Name *</FieldLabel>
                <Input
                  value={form.name}
                  onChange={(e) => f("name", e.target.value)}
                  placeholder="Full name"
                  disabled={saving}
                />
              </div>

              {/* Department — searchable combobox */}
              <div className="space-y-1" onWheel={(e) => e.stopPropagation()}>
                <FieldLabel>Department *</FieldLabel>
                <DepartmentCombobox
                  departments={departments}
                  value={form.departmentId}
                  onChange={(v) => f("departmentId", v)}
                  disabled={saving}
                />
              </div>

              {/* Location — searchable combobox */}
              <div className="space-y-1" onWheel={(e) => e.stopPropagation()}>
                <FieldLabel>Location *</FieldLabel>
                <LocationCombobox
                  locations={locations}
                  value={form.locationId}
                  onChange={(v) => f("locationId", v)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-1">
                <FieldLabel>Phone</FieldLabel>
                <Input
                  value={form.phone_no}
                  onChange={(e) => f("phone_no", e.target.value)}
                  placeholder="07X-XXX-XXXX"
                  disabled={saving}
                />
              </div>

              <div className="space-y-1">
                <FieldLabel>Email</FieldLabel>
                <Input
                  value={form.email}
                  onChange={(e) => f("email", e.target.value)}
                  placeholder="name@cic.lk"
                  disabled={saving}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={form.employeeStatus}
                  onValueChange={(v) =>
                    f("employeeStatus", v as "ACTIVE" | "INACTIVE")
                  }
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              type="button"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} type="button" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}

// ─── SuppliersTab ─────────────────────────────────────────────────────────────

export interface SuppliersTabProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  loading: boolean;
  onDelete: (id: number, label: string) => void;
}

export function SuppliersTab({
  suppliers,
  setSuppliers,
  loading,
  onDelete,
}: SuppliersTabProps) {
  const { createSupplier, updateSupplier } = useManagementApi();

  const [q, setQ] = React.useState("");
  const [openForm, setOpenForm] = React.useState(false);
  const [editing, setEditing] = React.useState<Supplier | null>(null);
  const [saving, setSaving] = React.useState(false);

  const blank: SupplierPayload = { name: "", phone_no: "", email: "" };
  const [form, setForm] = React.useState<SupplierPayload>(blank);

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        !t ||
        `${s.name} ${s.phone_no ?? ""} ${s.email ?? ""}`
          .toLowerCase()
          .includes(t),
    );
  }, [suppliers, q]);

  const { page, setPage, pageSize, setPageSize, totalPages, paged } =
    usePagination(filtered, [q]);

  const openAdd = () => {
    setEditing(null);
    setForm(blank);
    setOpenForm(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, phone_no: s.phone_no ?? "", email: s.email ?? "" });
    setOpenForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert("Supplier name is required.");
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateSupplier(editing.id, form);
        setSuppliers((p) => p.map((x) => (x.id === editing.id ? updated : x)));
      } else {
        const created = await createSupplier(form);
        setSuppliers((p) => [created, ...p]);
      }
      setOpenForm(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const f = (k: keyof SupplierPayload, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <TabsContent value="suppliers" className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Suppliers</CardTitle>
              <FieldLabel>Vendors for purchasing and maintenance</FieldLabel>
            </div>
            <Button
              onClick={openAdd}
              className="gap-2"
              type="button"
              disabled={loading}
            >
              <Plus className="h-4 w-4" /> Add Supplier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-1">
            <FieldLabel>Search</FieldLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="name, phone, email…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Supplier List{" "}
            <span className="text-muted-foreground">
              {loading ? "" : `(${filtered.length})`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="mx-6 rounded-t-md border-x border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <LoadingRow colSpan={4} />
                ) : paged.length === 0 ? (
                  <EmptyRow colSpan={4} text="No suppliers found." />
                ) : (
                  paged.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.phone_no || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.email || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ActionMenu
                          onEdit={() => openEdit(s)}
                          onDelete={() => onDelete(s.id, s.name)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mx-6 rounded-b-md border-x border-b">
            <PaginationControls
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={(o) => !saving && setOpenForm(o)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <FieldLabel>Name *</FieldLabel>
              <Input
                value={form.name}
                onChange={(e) => f("name", e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>Phone</FieldLabel>
              <Input
                value={form.phone_no ?? ""}
                onChange={(e) => f("phone_no", e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>Email</FieldLabel>
              <Input
                value={form.email ?? ""}
                onChange={(e) => f("email", e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              type="button"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} type="button" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}

// ─── DepartmentsTab ───────────────────────────────────────────────────────────

export interface DepartmentsTabProps {
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  loading: boolean;
  onDelete: (id: number, label: string) => void;
}

export function DepartmentsTab({
  departments,
  setDepartments,
  loading,
  onDelete,
}: DepartmentsTabProps) {
  const { createDepartment, updateDepartment } = useManagementApi();

  const [q, setQ] = React.useState("");
  const [openForm, setOpenForm] = React.useState(false);
  const [editing, setEditing] = React.useState<Department | null>(null);
  const [saving, setSaving] = React.useState(false);

  const blank: DepartmentPayload = { name: "", code: "" };
  const [form, setForm] = React.useState<DepartmentPayload>(blank);

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    return departments.filter(
      (d) => !t || `${d.name} ${d.code}`.toLowerCase().includes(t),
    );
  }, [departments, q]);

  const { page, setPage, pageSize, setPageSize, totalPages, paged } =
    usePagination(filtered, [q]);

  const openAdd = () => {
    setEditing(null);
    setForm(blank);
    setOpenForm(true);
  };
  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ name: d.name, code: d.code });
    setOpenForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert("Department name is required.");
    if (!form.code.trim()) return alert("Department code is required.");
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateDepartment(editing.id, form);
        setDepartments((p) =>
          p.map((x) => (x.id === editing.id ? updated : x)),
        );
      } else {
        const created = await createDepartment(form);
        setDepartments((p) => [created, ...p]);
      }
      setOpenForm(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const f = (k: keyof DepartmentPayload, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <TabsContent value="departments" className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Departments</CardTitle>
              <FieldLabel>Used for employee grouping and reporting</FieldLabel>
            </div>
            <Button
              onClick={openAdd}
              className="gap-2"
              type="button"
              disabled={loading}
            >
              <Plus className="h-4 w-4" /> Add Department
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-1">
            <FieldLabel>Search</FieldLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="name, code…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Department List{" "}
            <span className="text-muted-foreground">
              {loading ? "" : `(${filtered.length})`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="mx-6 rounded-t-md border-x border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <LoadingRow colSpan={3} />
                ) : paged.length === 0 ? (
                  <EmptyRow colSpan={3} text="No departments found." />
                ) : (
                  paged.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.code}
                      </TableCell>
                      <TableCell className="text-right">
                        <ActionMenu
                          onEdit={() => openEdit(d)}
                          onDelete={() =>
                            onDelete(d.id, `${d.name} (${d.code})`)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mx-6 rounded-b-md border-x border-b">
            <PaginationControls
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={(o) => !saving && setOpenForm(o)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Department" : "Add Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <FieldLabel>Name *</FieldLabel>
              <Input
                value={form.name}
                onChange={(e) => f("name", e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>Code *</FieldLabel>
              <Input
                value={form.code}
                onChange={(e) => f("code", e.target.value)}
                placeholder="FIN / IT / HR"
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              type="button"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} type="button" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}

// ─── LocationsTab ─────────────────────────────────────────────────────────────

export interface LocationsTabProps {
  locations: Location[];
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  loading: boolean;
  onDelete: (id: number, label: string) => void;
}

export function LocationsTab({
  locations,
  setLocations,
  loading,
  onDelete,
}: LocationsTabProps) {
  const { createLocation, updateLocation } = useManagementApi();

  const [q, setQ] = React.useState("");
  const [openForm, setOpenForm] = React.useState(false);
  const [editing, setEditing] = React.useState<Location | null>(null);
  const [saving, setSaving] = React.useState(false);

  const blank: LocationPayload = { name: "", code: "" };
  const [form, setForm] = React.useState<LocationPayload>(blank);

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    return locations.filter(
      (l) => !t || `${l.name} ${l.code}`.toLowerCase().includes(t),
    );
  }, [locations, q]);

  const { page, setPage, pageSize, setPageSize, totalPages, paged } =
    usePagination(filtered, [q]);

  const openAdd = () => {
    setEditing(null);
    setForm(blank);
    setOpenForm(true);
  };
  const openEdit = (l: Location) => {
    setEditing(l);
    setForm({ name: l.name, code: l.code });
    setOpenForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert("Location name is required.");
    if (!form.code.trim()) return alert("Location code is required.");
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateLocation(editing.id, form);
        setLocations((p) => p.map((x) => (x.id === editing.id ? updated : x)));
      } else {
        const created = await createLocation(form);
        setLocations((p) => [created, ...p]);
      }
      setOpenForm(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const f = (k: keyof LocationPayload, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <TabsContent value="locations" className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Locations</CardTitle>
              <FieldLabel>Offices/branches where assets are stored</FieldLabel>
            </div>
            <Button
              onClick={openAdd}
              className="gap-2"
              type="button"
              disabled={loading}
            >
              <Plus className="h-4 w-4" /> Add Location
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-1">
            <FieldLabel>Search</FieldLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="name, code…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Location List{" "}
            <span className="text-muted-foreground">
              {loading ? "" : `(${filtered.length})`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="mx-6 rounded-t-md border-x border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <LoadingRow colSpan={3} />
                ) : paged.length === 0 ? (
                  <EmptyRow colSpan={3} text="No locations found." />
                ) : (
                  paged.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {l.code}
                      </TableCell>
                      <TableCell className="text-right">
                        <ActionMenu
                          onEdit={() => openEdit(l)}
                          onDelete={() =>
                            onDelete(l.id, `${l.name} (${l.code})`)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mx-6 rounded-b-md border-x border-b">
            <PaginationControls
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={(o) => !saving && setOpenForm(o)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Location" : "Add Location"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <FieldLabel>Name *</FieldLabel>
              <Input
                value={form.name}
                onChange={(e) => f("name", e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>Code *</FieldLabel>
              <Input
                value={form.code}
                onChange={(e) => f("code", e.target.value)}
                placeholder="HQ-CMB / FAC-KDY"
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              type="button"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} type="button" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
