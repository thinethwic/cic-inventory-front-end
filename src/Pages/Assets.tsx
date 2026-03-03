import * as React from "react";
import { Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";

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

type AssetStatus = "Available" | "Assigned" | "In Repair" | "Retired";

type Asset = {
  id: string;
  assetCode: string;
  category: string;
  brand: string;
  model: string;
  serialNo: string;
  status: AssetStatus;
  location: string;
  assignedTo?: string;
  purchaseDate?: string;
  warrantyEnd?: string;
};

const statusOptions: AssetStatus[] = [
  "Available",
  "Assigned",
  "In Repair",
  "Retired",
];
const categoryOptions = [
  "Laptop",
  "Desktop",
  "Printer",
  "Router",
  "Switch",
  "Other",
];

const seedAssets: Asset[] = [
  {
    id: "1",
    assetCode: "CIC-IT-LAP-0021",
    category: "Laptop",
    brand: "Dell",
    model: "Latitude 5420",
    serialNo: "DL-5420-A1",
    status: "Assigned",
    assignedTo: "E1023 - Daniel Perera",
    location: "HQ / Finance",
    purchaseDate: "2025-01-10",
    warrantyEnd: "2027-01-10",
  },
  {
    id: "2",
    assetCode: "CIC-IT-PRN-0007",
    category: "Printer",
    brand: "HP",
    model: "M404dn",
    serialNo: "HP-M404-77",
    status: "Available",
    location: "HQ / Store",
    purchaseDate: "2024-08-02",
    warrantyEnd: "2026-08-02",
  },
  {
    id: "3",
    assetCode: "CIC-IT-NET-0012",
    category: "Router",
    brand: "MikroTik",
    model: "hAP ac2",
    serialNo: "MT-AC2-12",
    status: "In Repair",
    location: "Factory / Office",
  },
];

function StatusBadge({ status }: { status: AssetStatus }) {
  const variant =
    status === "Available"
      ? "secondary"
      : status === "Assigned"
        ? "default"
        : status === "In Repair"
          ? "destructive"
          : "outline";

  return <Badge variant={variant}>{status}</Badge>;
}

type AssetFormState = Omit<Asset, "id">;

const emptyForm: AssetFormState = {
  assetCode: "",
  category: "Laptop",
  brand: "",
  model: "",
  serialNo: "",
  status: "Available",
  location: "",
  assignedTo: "",
  purchaseDate: "",
  warrantyEnd: "",
};

export default function Assets() {
  const [assets, setAssets] = React.useState<Asset[]>(seedAssets);

  // Filters
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<AssetStatus | "All">(
    "All",
  );
  const [categoryFilter, setCategoryFilter] = React.useState<string | "All">(
    "All",
  );

  // Dialog state
  const [openForm, setOpenForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<AssetFormState>(emptyForm);

  // Delete confirm
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const text = q.trim().toLowerCase();
    return assets.filter((a) => {
      const matchText =
        !text ||
        `${a.assetCode} ${a.serialNo} ${a.brand} ${a.model} ${a.location} ${a.assignedTo ?? ""}`
          .toLowerCase()
          .includes(text);

      const matchStatus =
        statusFilter === "All" ? true : a.status === statusFilter;
      const matchCat =
        categoryFilter === "All" ? true : a.category === categoryFilter;

      return matchText && matchStatus && matchCat;
    });
  }, [assets, q, statusFilter, categoryFilter]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpenForm(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingId(asset.id);
    const { id, ...rest } = asset;
    setForm({
      ...rest,
      assignedTo: asset.assignedTo ?? "",
      purchaseDate: asset.purchaseDate ?? "",
      warrantyEnd: asset.warrantyEnd ?? "",
    });
    setOpenForm(true);
  };

  const validateForm = (): string | null => {
    if (!form.assetCode.trim()) return "Asset code is required.";
    if (!form.serialNo.trim()) return "Serial number is required.";
    if (!form.location.trim()) return "Location is required.";
    return null;
  };

  const save = () => {
    const err = validateForm();
    if (err) {
      alert(err);
      return;
    }

    if (editingId) {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === editingId ? { ...a, ...form, id: editingId } : a,
        ),
      );
    } else {
      const newAsset: Asset = { id: crypto.randomUUID(), ...form };
      setAssets((prev) => [newAsset, ...prev]);
    }

    setOpenForm(false);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setAssets((prev) => prev.filter((a) => a.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground">
            Register and monitor CIC IT assets.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Search</div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="asset code, serial, model, location, employee..."
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Status</div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as AssetStatus | "All")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Category</div>
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
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
            Asset List{" "}
            <span className="text-muted-foreground">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serial No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-10"
                    >
                      No assets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.assetCode}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.category}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.brand} {a.model}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.serialNo}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.location}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(a)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteId(a.id)}
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Asset" : "Add Asset"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Asset Code *</div>
              <Input
                value={form.assetCode}
                onChange={(e) =>
                  setForm((p) => ({ ...p, assetCode: e.target.value }))
                }
                placeholder="CIC-IT-LAP-0001"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Category</div>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Brand</div>
              <Input
                value={form.brand}
                onChange={(e) =>
                  setForm((p) => ({ ...p, brand: e.target.value }))
                }
                placeholder="Dell / HP / Lenovo"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Model</div>
              <Input
                value={form.model}
                onChange={(e) =>
                  setForm((p) => ({ ...p, model: e.target.value }))
                }
                placeholder="Latitude 5420"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Serial No *</div>
              <Input
                value={form.serialNo}
                onChange={(e) =>
                  setForm((p) => ({ ...p, serialNo: e.target.value }))
                }
                placeholder="Serial number"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Status</div>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, status: v as AssetStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">Location *</div>
              <Input
                value={form.location}
                onChange={(e) =>
                  setForm((p) => ({ ...p, location: e.target.value }))
                }
                placeholder="HQ / IT / Room 02"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">
                Assigned To (optional)
              </div>
              <Input
                value={form.assignedTo ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, assignedTo: e.target.value }))
                }
                placeholder="E1023 - Name"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Purchase Date</div>
              <Input
                type="date"
                value={form.purchaseDate ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, purchaseDate: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Warranty End</div>
              <Input
                type="date"
                value={form.warrantyEnd ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, warrantyEnd: e.target.value }))
                }
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
              {editingId ? "Save Changes" : "Create Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The asset will be removed from the
              list.
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
