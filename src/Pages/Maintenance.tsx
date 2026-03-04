import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
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

import type { Asset } from "@/types";
import { seedAssets } from "@/assets.seed";

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

import { seedMaintenance } from "@/assets.seed";

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const variant =
    status === "Completed"
      ? "secondary"
      : status === "Cancelled"
        ? "outline"
        : status === "In Progress"
          ? "default"
          : "destructive"; // Open => make it stand out

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

function nextTicketNo(existing: Maintenance[]): string {
  // MT-0001 style
  const nums = existing
    .map((m) => Number(m.ticketNo.replace("MT-", "")))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `MT-${String(next).padStart(4, "0")}`;
}

export default function MaintenancePage() {
  const [assets] = React.useState<Asset[]>(seedAssets);
  const [rows, setRows] = React.useState<Maintenance[]>(seedMaintenance);

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

  // Delete confirm
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const text = q.trim().toLowerCase();
    return rows.filter((m) => {
      const matchText =
        !text ||
        `${m.ticketNo} ${m.assetCode} ${m.issueTitle} ${m.assignedTo ?? ""} ${m.supplier ?? ""}`
          .toLowerCase()
          .includes(text);

      const matchStatus =
        statusFilter === "All" ? true : m.status === statusFilter;
      const matchPriority =
        priorityFilter === "All" ? true : m.priority === priorityFilter;

      return matchText && matchStatus && matchPriority;
    });
  }, [rows, q, statusFilter, priorityFilter]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...emptyMaintenanceForm,
      ticketNo: nextTicketNo(rows),
      reportedDate: new Date().toISOString().slice(0, 10),
    });
    setOpenForm(true);
  };

  const openEdit = (m: Maintenance) => {
    setEditingId(m.id);
    const { id, ...rest } = m;
    setForm({
      ...rest,
      description: rest.description ?? "",
      dueDate: rest.dueDate ?? "",
      completedDate: rest.completedDate ?? "",
      assignedTo: rest.assignedTo ?? "",
      supplier: rest.supplier ?? "",
      notes: rest.notes ?? "",
      cost: rest.cost,
    });
    setOpenForm(true);
  };

  const onAssetChange = (assetId: string) => {
    const a = assets.find((x) => x.id === assetId);
    setForm((p) => ({
      ...p,
      assetId,
      assetCode: a?.assetCode ?? "",
    }));
  };

  const validate = (): string | null => {
    if (!form.ticketNo.trim()) return "Ticket no is required.";
    if (!form.assetId) return "Asset is required.";
    if (!form.issueTitle.trim()) return "Issue title is required.";
    if (!form.reportedDate) return "Reported date is required.";
    return null;
  };

  const save = () => {
    const err = validate();
    if (err) return alert(err);

    // if completed, set completedDate if not set
    const normalized: MaintenanceFormState =
      form.status === "Completed" && !form.completedDate
        ? { ...form, completedDate: new Date().toISOString().slice(0, 10) }
        : form;

    if (editingId) {
      setRows((p) =>
        p.map((x) =>
          x.id === editingId ? { ...x, ...normalized, id: editingId } : x,
        ),
      );
    } else {
      setRows((p) => [{ id: crypto.randomUUID(), ...normalized }, ...p]);
    }
    setOpenForm(false);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setRows((p) => p.filter((x) => x.id !== deleteId));
    setDeleteId(null);
  };

  const markCompleted = (id: string) => {
    setRows((p) =>
      p.map((x) =>
        x.id === id
          ? {
              ...x,
              status: "Completed",
              completedDate: new Date().toISOString().slice(0, 10),
            }
          : x,
      ),
    );
  };

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
          <Plus className="h-4 w-4" />
          New Ticket
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

      {/* List */}
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
                {filtered.length === 0 ? (
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
                          {m.supplier ? ` • Supplier: ${m.supplier}` : ""}
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
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Actions"
                              type="button"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {m.status !== "Completed" && (
                              <DropdownMenuItem
                                onClick={() => markCompleted(m.id)}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Mark Completed
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEdit(m)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteId(m.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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

      {/* Add/Edit Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Ticket" : "New Ticket"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Ticket No *</div>
              <Input
                value={form.ticketNo}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ticketNo: e.target.value }))
                }
                placeholder="MT-0001"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Asset *</div>
              <Select value={form.assetId} onValueChange={onAssetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.assetCode} • {a.brand} {a.model}
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
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Priority</div>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, priority: v as MaintenancePriority }))
                }
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
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Supplier</div>
              <Input
                value={form.supplier ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, supplier: e.target.value }))
                }
                placeholder="Vendor name"
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
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button onClick={save} type="button">
              {editingId ? "Save Changes" : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
