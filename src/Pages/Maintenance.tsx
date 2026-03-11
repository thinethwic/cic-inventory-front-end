// src/pages/MaintenancePage.tsx
import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  Loader2,
} from "lucide-react";
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

import type { Asset, Supplier } from "@/types";
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
import { useMaintenanceApi } from "@/lib/maintainance-api";
import { useAssetApi } from "@/lib/api";

// ─── Badge helpers ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: MaintenanceStatus }) {
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const {
    getAll,
    getAssets,
    getSuppliers,
    create,
    update,
    remove,
    markCompleted,
  } = useMaintenanceApi();

  const { updateStatus: updateAssetStatus } = useAssetApi();

  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [rows, setRows] = React.useState<Maintenance[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Filters
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    MaintenanceStatus | "All"
  >("All");
  const [priorityFilter, setPriorityFilter] = React.useState<
    MaintenancePriority | "All"
  >("All");

  // Form dialog
  const [openForm, setOpenForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] =
    React.useState<MaintenanceFormState>(emptyMaintenanceForm);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Duplicate asset warning
  const [duplicateAssetId, setDuplicateAssetId] = React.useState<string | null>(
    null,
  );

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  const fetchMaintenance = React.useCallback(async () => {
    setLoading(true);
    try {
      const page = await getAll();
      setRows(Array.isArray(page?.content) ? page.content : []);
    } catch (e) {
      console.error("Failed to load maintenance:", e);
    } finally {
      setLoading(false);
    }
  }, [getAll]);

  React.useEffect(() => {
    fetchMaintenance();
  }, [fetchMaintenance]);

  React.useEffect(() => {
    getAssets()
      .then((p) => setAssets(Array.isArray(p?.content) ? p.content : []))
      .catch((e) => {
        console.error("Failed to load assets:", e);
        setAssets([]);
      });
  }, [getAssets]);

  React.useEffect(() => {
    getSuppliers()
      .then((data) => setSuppliers(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error("Failed to load suppliers:", e);
        setSuppliers([]);
      });
  }, [getSuppliers]);

  // ── Client-side filter ──────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    const text = q.trim().toLowerCase();

    return rows.filter((m) => {
      const matchText =
        !text ||
        `${m.ticketNo} ${m.assetCode} ${m.issueTitle} ${m.assignedTo ?? ""} ${m.supplierName ?? ""}`
          .toLowerCase()
          .includes(text);

      const matchStatus = statusFilter === "All" || m.status === statusFilter;
      const matchPriority =
        priorityFilter === "All" || m.priority === priorityFilter;

      return matchText && matchStatus && matchPriority;
    });
  }, [rows, q, statusFilter, priorityFilter]);

  // ── Check if asset already has an active ticket ─────────────────────────────
  const hasActiveTicket = (assetId: string, excludeId?: string | null) =>
    rows.some(
      (m) =>
        m.assetId === assetId &&
        m.id !== excludeId &&
        m.status !== "Completed" &&
        m.status !== "Cancelled",
    );

  // ── Dialog helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setFormError(null);
    setForm({
      ...emptyMaintenanceForm,
      ticketNo: "",
      reportedDate: new Date().toISOString().slice(0, 10),
    });
    setOpenForm(true);
  };

  const openEdit = (m: Maintenance) => {
    setEditingId(m.id);
    setFormError(null);
    setForm({
      ticketNo: m.ticketNo,
      assetId: m.assetId,
      assetCode: m.assetCode,
      supplierId: m.supplierId,
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
    setOpenForm(true);
  };

  const onAssetChange = (assetId: string) => {
    const a = assets.find((x) => String(x.id) === assetId);
    setForm((p) => ({ ...p, assetId, assetCode: a?.assetCode ?? "" }));
  };

  // ── Validate ────────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.assetId) return "Asset is required.";
    if (!form.supplierId) return "Supplier is required.";
    if (!form.issueTitle.trim()) return "Issue title is required.";
    if (!form.reportedDate) return "Reported date is required.";
    return null;
  };

  // ── Save (create / update) ──────────────────────────────────────────────────
  const save = async () => {
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }

    setFormError(null);

    if (!editingId && hasActiveTicket(form.assetId)) {
      setDuplicateAssetId(form.assetId);
      return;
    }

    const isClosed = form.status === "Completed" || form.status === "Cancelled";

    setSaving(true);
    try {
      if (editingId) {
        const updated = await update(editingId, form);
        setRows((p) => p.map((x) => (x.id === editingId ? updated : x)));
      } else {
        // On create, backend generates ticketNo
        const createPayload = {
          ...form,
        };
        const created = await create(createPayload as MaintenanceFormState);
        setRows((p) => [created, ...p]);
      }

      await updateAssetStatus(
        form.assetId,
        isClosed ? "Available" : "In Repair",
      );

      setOpenForm(false);
      setEditingId(null);
      setForm({
        ...emptyMaintenanceForm,
        ticketNo: "",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save ticket.";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const existing = rows.find((x) => x.id === deleteId);

      await remove(deleteId);
      setRows((p) => p.filter((x) => x.id !== deleteId));

      if (existing?.assetId) {
        const stillHasOpenTicket = rows.some(
          (m) =>
            m.id !== deleteId &&
            m.assetId === existing.assetId &&
            m.status !== "Completed" &&
            m.status !== "Cancelled",
        );

        await updateAssetStatus(
          existing.assetId,
          stillHasOpenTicket ? "In Repair" : "Available",
        );
      }
    } catch (e) {
      console.error("Failed to delete ticket:", e);
    } finally {
      setDeleteId(null);
    }
  };

  // ── Mark completed ──────────────────────────────────────────────────────────
  const handleMarkCompleted = async (id: string) => {
    const existing = rows.find((x) => x.id === id);
    if (!existing) return;

    try {
      const updated = await markCompleted(id, existing);
      setRows((p) => p.map((x) => (x.id === id ? updated : x)));
      await updateAssetStatus(existing.assetId, "Available");
    } catch (e) {
      console.error("Failed to mark completed:", e);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
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
              placeholder="ticket, asset code, issue, supplier..."
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
            <span className="text-muted-foreground">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No maintenance tickets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
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
                          {m.supplierName
                            ? ` • Supplier: ${m.supplierName}`
                            : ""}
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
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" type="button">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {m.status !== "Completed" && (
                              <DropdownMenuItem
                                onClick={() => handleMarkCompleted(m.id)}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Mark Completed
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
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog
        open={openForm}
        onOpenChange={(open) => {
          if (!saving) setOpenForm(open);
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

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Asset *</div>
              <Select
                value={form.assetId}
                onValueChange={onAssetChange}
                disabled={saving || !!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.assetCode} • {a.brand} {a.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Supplier *</div>
              <Select
                value={form.supplierId ? String(form.supplierId) : ""}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    supplierId: v,
                  }))
                }
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">Issue Title *</div>
              <Input
                value={form.issueTitle}
                onChange={(e) =>
                  setForm((p) => ({ ...p, issueTitle: e.target.value }))
                }
                placeholder="Battery health degraded"
                disabled={saving}
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
                disabled={saving}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Priority</div>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, priority: v as MaintenancePriority }))
                }
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Assigned To</div>
              <Input
                value={form.assignedTo ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, assignedTo: e.target.value }))
                }
                placeholder="Technician name"
                disabled={saving}
              />
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
                disabled={saving}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">Notes</div>
              <Input
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Extra notes..."
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
              {editingId ? "Save Changes" : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate asset active ticket warning */}
      <AlertDialog
        open={!!duplicateAssetId}
        onOpenChange={(open) => !open && setDuplicateAssetId(null)}
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
        onOpenChange={(open) => !open && setDeleteId(null)}
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
            <AlertDialogAction onClick={confirmDelete} type="button">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
