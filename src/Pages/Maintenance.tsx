// src/pages/MaintenancePage.tsx
import * as React from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  Loader2,
  Search,
  ChevronsUpDown,
  Check,
  Building2,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { cn } from "@/lib/utils";

import type { Asset, AssetStatus, Supplier } from "@/types";
import type {
  Maintenance,
  MaintenanceFormState,
  MaintenancePriority,
  MaintenanceStatus,
} from "@/types";
import {
  emptyMaintenanceForm,
  maintenancePriorityOptions,
  maintenanceStatusOptions,
} from "@/types";
import {
  fetchMaintenancePage,
  fetchAllAssetsForMaintenance,
  fetchAllSuppliers,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  markMaintenanceCompleted,
} from "@/lib/maintainance-api";
import { useAssetApi } from "@/lib/api";

// ─── Query keys ───────────────────────────────────────────────────────────────
const QK = {
  maintenance: (
    page: number,
    size: number,
    search: string,
    status: string,
    priority: string,
  ) => ["maintenance", page, size, search, status, priority] as const,
  assets: ["maintenance-assets"] as const,
  suppliers: ["maintenance-suppliers"] as const,
};

// ─── Asset status mapping ─────────────────────────────────────────────────────
function getAssetStatus(maintenanceStatus: MaintenanceStatus): AssetStatus {
  switch (maintenanceStatus) {
    case "Open":
      return "Damaged";
    case "In Progress":
      return "In Repair";
    case "Completed":
      return "Available";
    case "Cancelled":
      return "Available";
    case "Cannot Repair":
      return "Disposed";
    default:
      return "In Repair";
  }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: MaintenanceStatus }) {
  if (status === "Cannot Repair") {
    return (
      <Badge className="bg-orange-500 text-white hover:bg-orange-600 border-transparent">
        Cannot Repair
      </Badge>
    );
  }
  const variant =
    status === "Completed"
      ? "secondary"
      : status === "Cancelled"
        ? "outline"
        : status === "In Progress"
          ? "default"
          : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}

// ─── Priority Badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const variant =
    priority === "Critical"
      ? "destructive"
      : priority === "High"
        ? "default"
        : priority === "Medium"
          ? "secondary"
          : "outline";
  return <Badge variant={variant}>{priority}</Badge>;
}

// ─── Asset Combobox ───────────────────────────────────────────────────────────
interface AssetComboboxProps {
  assets: Asset[];
  value: string;
  onChange: (assetId: string) => void;
  disabled?: boolean;
}

function AssetCombobox({
  assets,
  value,
  onChange,
  disabled,
}: AssetComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) =>
      `${a.assetCode} ${a.brand ?? ""} ${a.model ?? ""} ${a.serialNo ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [assets, search]);

  const selected = assets.find((a) => String(a.id) === value);

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
              <span className="font-medium text-foreground">
                {selected.assetCode}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="truncate text-muted-foreground">
                {selected.brand} {selected.model}
              </span>
              {selected.serialNo && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {selected.serialNo}
                  </span>
                </>
              )}
            </span>
          ) : (
            "Search and select an asset..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b px-3 py-2 gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, brand, model, serial..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No assets found.
            </div>
          ) : (
            filtered.map((a) => {
              const isSelected = String(a.id) === value;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onChange(String(a.id));
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
                      <span className="font-semibold text-foreground">
                        {a.assetCode}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="truncate text-muted-foreground">
                        {a.brand} {a.model}
                      </span>
                    </div>
                    {a.serialNo && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-medium">S/N:</span>
                        <span className="font-mono">{a.serialNo}</span>
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

// ─── Supplier Combobox ────────────────────────────────────────────────────────
interface SupplierComboboxProps {
  suppliers: Supplier[];
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function SupplierCombobox({
  suppliers,
  value,
  onChange,
  disabled,
  loading,
}: SupplierComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      `${s.name} ${s.contactPerson ?? ""}`.toLowerCase().includes(q),
    );
  }, [suppliers, search]);

  const selected = suppliers.find((s) => s.name === value);

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
          disabled={disabled || loading}
          type="button"
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading suppliers...
            </span>
          ) : selected ? (
            <span className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {selected.name}
              </span>
              {selected.contactPerson && (
                <span className="truncate text-xs text-muted-foreground">
                  · {selected.contactPerson}
                </span>
              )}
            </span>
          ) : (
            "Search and select a supplier..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b px-3 py-2 gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier name..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No suppliers found.
            </div>
          ) : (
            filtered.map((s) => {
              const isSelected = s.name === value;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onChange(s.name);
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
                    <div className="font-semibold text-foreground">
                      {s.name}
                    </div>
                    {s.contactPerson && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Contact: {s.contactPerson}
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

// ─── Technician Toggle ────────────────────────────────────────────────────────
type TechnicianType = "internal" | "supplier";

function TechnicianToggle({
  value,
  onChange,
  disabled,
}: {
  value: TechnicianType;
  onChange: (v: TechnicianType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex rounded-md border overflow-hidden w-fit">
      {(["internal", "supplier"] as TechnicianType[]).map((t) => (
        <button
          key={t}
          type="button"
          disabled={disabled}
          onClick={() => onChange(t)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
            t === "supplier" && "border-l",
            value === t
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted",
          )}
        >
          {t === "internal" ? (
            <User className="h-3.5 w-3.5" />
          ) : (
            <Building2 className="h-3.5 w-3.5" />
          )}
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const { updateStatus: updateAssetStatus } = useAssetApi();

  const getTokenRef = React.useRef(getToken);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    MaintenanceStatus | "All"
  >("All");
  const [priorityFilter, setPriorityFilter] = React.useState<
    MaintenancePriority | "All"
  >("All");

  // Debounce search input by 400ms to avoid hammering backend
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(25);

  // Reset to page 0 when filters change
  React.useEffect(() => {
    setPage(0);
  }, [debouncedQ, statusFilter, priorityFilter]);

  // ── React Query: maintenance tickets (server-side paginated + filtered) ────
  const {
    data: maintenancePage,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: QK.maintenance(
      page,
      pageSize,
      debouncedQ,
      statusFilter,
      priorityFilter,
    ),
    queryFn: () =>
      fetchMaintenancePage(
        getTokenRef.current,
        page,
        pageSize,
        debouncedQ,
        statusFilter,
        priorityFilter,
      ),
    placeholderData: keepPreviousData,
  });

  const rows: Maintenance[] = maintenancePage?.content ?? [];
  const totalElements = maintenancePage?.totalElements ?? 0;
  const totalPages = maintenancePage?.totalPages ?? 1;

  const rangeStart = totalElements === 0 ? 0 : page * pageSize + 1;
  const rangeEnd = Math.min((page + 1) * pageSize, totalElements);

  // ── React Query: assets for combobox ──────────────────────────────────────
  const { data: assets = [] } = useQuery({
    queryKey: QK.assets,
    queryFn: () => fetchAllAssetsForMaintenance(getTokenRef.current),
    staleTime: 1000 * 60 * 2,
  });

  // ── React Query: suppliers — only load when form opens ────────────────────
  const [formOpen, setFormOpen] = React.useState(false);
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: QK.suppliers,
    queryFn: () => fetchAllSuppliers(getTokenRef.current),
    enabled: formOpen,
    staleTime: 1000 * 60 * 5,
  });

  // ── Form state ─────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] =
    React.useState<MaintenanceFormState>(emptyMaintenanceForm);
  const [technicianType, setTechnicianType] =
    React.useState<TechnicianType>("internal");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [duplicateAssetId, setDuplicateAssetId] = React.useState<string | null>(
    null,
  );

  // ── Dialog helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setFormError(null);
    setTechnicianType("internal");
    setForm({
      ...emptyMaintenanceForm,
      ticketNo: "",
      reportedDate: new Date().toISOString().slice(0, 10),
    });
    setFormOpen(true);
  };

  const openEdit = (m: Maintenance) => {
    setEditingId(m.id);
    setFormError(null);
    setTechnicianType(m.supplierId ? "supplier" : "internal");
    setForm({
      ticketNo: m.ticketNo,
      assetId: m.assetId,
      assetCode: m.assetCode,
      issueTitle: m.issueTitle,
      description: m.description ?? "",
      priority: m.priority,
      status: m.status,
      reportedDate: m.reportedDate,
      dueDate: m.dueDate ?? "",
      assignedTo: m.assignedTo ?? "",
      cost: m.cost,
      notes: m.notes ?? "",
    });
    setFormOpen(true);
  };

  const onAssetChange = (assetId: string) => {
    const a = assets.find((x) => String(x.id) === assetId);
    setForm((p) => ({ ...p, assetId, assetCode: a?.assetCode ?? "" }));
  };

  // ── Active ticket check ────────────────────────────────────────────────────
  const hasActiveTicket = (assetId: string, excludeId?: string | null) =>
    rows.some(
      (m) =>
        m.assetId === assetId &&
        m.id !== excludeId &&
        m.status !== "Completed" &&
        m.status !== "Cancelled" &&
        m.status !== "Cannot Repair",
    );

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.assetId) return "Asset is required.";
    if (!form.issueTitle.trim()) return "Issue title is required.";
    if (!form.reportedDate) return "Reported date is required.";
    return null;
  };

  // ── Save mutation ──────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const err = validate();
      if (err) throw new Error(err);

      if (!editingId && hasActiveTicket(form.assetId)) {
        setDuplicateAssetId(form.assetId);
        throw new Error("duplicate");
      }

      if (editingId) {
        return updateMaintenance(getTokenRef.current, editingId, form);
      }
      return createMaintenance(getTokenRef.current, form);
    },
    onSuccess: async (saved) => {
      await updateAssetStatus(saved.assetId, getAssetStatus(form.status));
      void qc.invalidateQueries({ queryKey: ["maintenance"] });
      setFormOpen(false);
      setEditingId(null);
      setTechnicianType("internal");
      setForm({ ...emptyMaintenanceForm, ticketNo: "" });
      toast.success(editingId ? "Ticket updated" : "Ticket created", {
        description: `${saved.ticketNo} — ${saved.issueTitle}`,
      });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to save ticket.";
      if (msg === "duplicate") return; // handled by duplicate dialog
      setFormError(msg);
      toast.error("Save failed", { description: msg });
    },
  });

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const existing = rows.find((x) => x.id === id);
      await deleteMaintenance(getTokenRef.current, id);

      if (existing?.assetId) {
        const stillActive = rows.some(
          (m) =>
            m.id !== id &&
            m.assetId === existing.assetId &&
            m.status !== "Completed" &&
            m.status !== "Cancelled" &&
            m.status !== "Cannot Repair",
        );
        const activeTicket = rows.find(
          (m) =>
            m.id !== id &&
            m.assetId === existing.assetId &&
            m.status !== "Completed" &&
            m.status !== "Cancelled" &&
            m.status !== "Cannot Repair",
        );
        await updateAssetStatus(
          existing.assetId,
          stillActive
            ? getAssetStatus(activeTicket?.status ?? "Open")
            : "Available",
        );
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Ticket deleted");
    },
    onError: (err) => {
      const msg =
        err instanceof Error ? err.message : "Failed to delete ticket.";
      toast.error("Delete failed", { description: msg });
    },
    onSettled: () => setDeleteId(null),
  });

  // ── Mark completed mutation ────────────────────────────────────────────────
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const existing = rows.find((x) => x.id === id);
      if (!existing) throw new Error("Ticket not found.");
      const updated = await markMaintenanceCompleted(
        getTokenRef.current,
        id,
        existing,
      );
      await updateAssetStatus(existing.assetId, "Available");
      return updated;
    },
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Ticket completed", {
        description: `${updated.ticketNo} marked as completed.`,
      });
    },
    onError: (err) => {
      const msg =
        err instanceof Error ? err.message : "Failed to mark completed.";
      toast.error("Action failed", { description: msg });
    },
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground">
            Track issues, repairs, costs, and completion for IT assets.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2" type="button">
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1 md:col-span-1">
            <div className="text-xs text-muted-foreground">Search</div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ticket, asset code, issue, assigned to..."
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Status</div>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as MaintenanceStatus | "All")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {maintenanceStatusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Priority</div>
            <Select
              value={priorityFilter}
              onValueChange={(v) =>
                setPriorityFilter(v as MaintenancePriority | "All")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {maintenancePriorityOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Tickets{" "}
            <span className="text-muted-foreground">({totalElements})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="pl-6">Ticket</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No maintenance tickets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((m) => (
                    <TableRow
                      key={m.id}
                      className={cn(
                        "hover:bg-muted/30",
                        isFetching && "opacity-60 transition-opacity",
                      )}
                    >
                      <TableCell className="pl-6 font-medium">
                        {m.ticketNo}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.assetCode}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{m.issueTitle}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {m.assignedTo
                            ? `Assigned: ${m.assignedTo}`
                            : "Unassigned"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={m.priority} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={m.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.reportedDate}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.dueDate || "-"}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" type="button">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {m.status !== "Completed" &&
                              m.status !== "Cannot Repair" && (
                                <DropdownMenuItem
                                  onClick={() => completeMutation.mutate(m.id)}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark
                                  Completed
                                </DropdownMenuItem>
                              )}
                            <DropdownMenuItem onClick={() => openEdit(m)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteId(m.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {totalElements === 0
                ? "No results"
                : `Showing ${rangeStart}–${rangeEnd} of ${totalElements}`}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Rows per page
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(0);
                  }}
                >
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
                  onClick={() => setPage(0)}
                  disabled={page === 0 || isFetching}
                  title="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isFetching}
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[90px] text-center text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page + 1 >= totalPages || isFetching}
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  type="button"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page + 1 >= totalPages || isFetching}
                  title="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!saveMutation.isPending) setFormOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Ticket" : "New Ticket"}
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">Ticket No</div>
              <Input
                value={editingId ? form.ticketNo : "Auto generated by system"}
                disabled
                readOnly
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">Asset *</div>
              {editingId ? (
                <Input value={form.assetCode} disabled readOnly />
              ) : (
                <AssetCombobox
                  assets={assets}
                  value={form.assetId}
                  onChange={onAssetChange}
                  disabled={saveMutation.isPending}
                />
              )}
            </div>

            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">Issue Title *</div>
              <Input
                value={form.issueTitle}
                onChange={(e) =>
                  setForm((p) => ({ ...p, issueTitle: e.target.value }))
                }
                placeholder="Battery health degraded"
                disabled={saveMutation.isPending}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">Description</div>
              <Input
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Describe the issue briefly..."
                disabled={saveMutation.isPending}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Priority</div>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, priority: v as MaintenancePriority }))
                }
                disabled={saveMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {maintenancePriorityOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Status</div>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, status: v as MaintenanceStatus }))
                }
                disabled={saveMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceStatusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Reported Date *
              </div>
              <Input
                type="date"
                value={form.reportedDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reportedDate: e.target.value }))
                }
                disabled={saveMutation.isPending}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Due Date</div>
              <Input
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, dueDate: e.target.value }))
                }
                disabled={saveMutation.isPending}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Assigned To</div>
                <TechnicianToggle
                  value={technicianType}
                  onChange={(t) => {
                    setTechnicianType(t);
                    setForm((p) => ({ ...p, assignedTo: "" }));
                  }}
                  disabled={saveMutation.isPending}
                />
              </div>
              {technicianType === "supplier" ? (
                <SupplierCombobox
                  suppliers={suppliers}
                  value={form.assignedTo ?? ""}
                  onChange={(name) =>
                    setForm((p) => ({ ...p, assignedTo: name }))
                  }
                  disabled={saveMutation.isPending}
                  loading={suppliersLoading}
                />
              ) : (
                <Input
                  value={form.assignedTo ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, assignedTo: e.target.value }))
                  }
                  placeholder="Technician name"
                  disabled={saveMutation.isPending}
                />
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Cost</div>
              <Input
                type="number"
                value={form.cost ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    cost:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  }))
                }
                placeholder="0"
                disabled={saveMutation.isPending}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Notes</div>
              <Input
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Extra notes..."
                disabled={saveMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              type="button"
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              type="button"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingId ? "Save Changes" : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate asset warning */}
      <AlertDialog
        open={!!duplicateAssetId}
        onOpenChange={(o) => !o && setDuplicateAssetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Active Ticket Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              This asset already has an open or in-progress maintenance ticket.
              Please complete or cancel the existing ticket before creating a
              new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The ticket will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              type="button"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
