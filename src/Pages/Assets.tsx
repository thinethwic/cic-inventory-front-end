// src/Pages/Assets.tsx
import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ScanLine,
  RefreshCw,
  Loader2,
  QrCode,
  Download,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Asset, AssetStatus, AssetFormState } from "@/types";
import { statusOptions, categoryOptions, emptyAssetForm } from "@/types";
import {
  fetchAssets,
  fetchAssetByScan,
  createAsset,
  updateAsset,
  deleteAsset,
} from "@/lib/api";

// ─── QR Code Generator (canvas-based, no external lib needed) ────────────────
// Uses the browser's built-in canvas + a lightweight QR encoding approach.
// We dynamically import "qrcode" (npm: qrcode) which is a standard dep.
// If your project doesn't have it yet, add: npm install qrcode @types/qrcode

import QRCodeLib from "qrcode";

// ─── QR Code Canvas Component ─────────────────────────────────────────────────
interface QRCanvasProps {
  value: string;
  size?: number;
}

function QRCanvas({ value, size = 220 }: QRCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: "#09090b", light: "#ffffff" },
    });
  }, [value, size]);

  return <canvas ref={canvasRef} />;
}

// ─── QR Code Dialog ────────────────────────────────────────────────────────────
interface QRDialogProps {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
}

function QRDialog({ asset, open, onClose }: QRDialogProps) {
  // Store the canvas element so handleDownload can access it
  const canvasElRef = React.useRef<HTMLCanvasElement | null>(null);

  // Build the QR payload — a compact JSON string with key asset identifiers
  const qrPayload = asset
    ? JSON.stringify({
        assetCode: asset.assetCode,
        serialNo: asset.serialNo,
        ...(asset.barcode ? { barcode: asset.barcode } : {}),
        brand: asset.brand,
        model: asset.model,
      })
    : "";

  // Callback ref: fires immediately when the canvas DOM node mounts/unmounts.
  // This avoids the timing issue where useEffect runs before the canvas exists.
  const canvasCallbackRef = React.useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasElRef.current = node;
      if (!node || !asset) return;
      QRCodeLib.toCanvas(node, qrPayload, {
        width: 220,
        margin: 2,
        color: { dark: "#09090b", light: "#ffffff" },
      });
    },
    // Re-run whenever the asset/payload changes (i.e. a different asset is opened)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qrPayload],
  );

  const handleDownload = () => {
    if (!canvasElRef.current || !asset) return;
    const url = canvasElRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR_${asset.assetCode}.png`;
    a.click();
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code — {asset.assetCode}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* QR canvas */}
          <div className="rounded-lg border bg-white p-3 shadow-inner">
            <canvas ref={canvasCallbackRef} />
          </div>

          {/* Asset summary below QR */}
          <div className="w-full rounded-md bg-muted/50 px-4 py-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Asset Code</span>
              <span className="font-medium">{asset.assetCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serial No</span>
              <span className="font-medium">{asset.serialNo}</span>
            </div>
            {asset.barcode && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Barcode</span>
                <span className="font-medium">{asset.barcode}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model</span>
              <span className="font-medium">
                {asset.brand} {asset.model}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{asset.location}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} type="button">
            Close
          </Button>
          <Button onClick={handleDownload} className="gap-2" type="button">
            <Download className="h-4 w-4" />
            Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
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

// ─── Assets Page ──────────────────────────────────────────────────────────────
export default function Assets() {
  const [assets, setAssets] = React.useState<Asset[]>([]);

  // Loading states only — no error states
  const [pageLoading, setPageLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [scanLoading, setScanLoading] = React.useState(false);

  // Filters
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<AssetStatus | "All">(
    "All",
  );
  const [categoryFilter, setCategoryFilter] = React.useState<string | "All">(
    "All",
  );

  // Barcode scan
  const [scanValue, setScanValue] = React.useState("");
  const scanRef = React.useRef<HTMLInputElement | null>(null);

  // Dialog / form state
  const [openForm, setOpenForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<AssetFormState>(emptyAssetForm);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // QR dialog
  const [qrAsset, setQrAsset] = React.useState<Asset | null>(null);

  // ── Load assets on mount ───────────────────────────────────────────────────
  const loadAssets = React.useCallback(async () => {
    setPageLoading(true);
    try {
      const data = await fetchAssets();
      setAssets(data);
    } catch {
      // silently fail — no UI error shown
    } finally {
      setPageLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  React.useEffect(() => {
    scanRef.current?.focus();
  }, []);

  // ── Filtered list (client-side) ────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    const text = q.trim().toLowerCase();
    return assets.filter((a) => {
      const matchText =
        !text ||
        `${a.assetCode} ${a.barcode ?? ""} ${a.serialNo} ${a.brand} ${a.model} ${a.location} ${a.assignedTo ?? ""}`
          .toLowerCase()
          .includes(text);
      const matchStatus = statusFilter === "All" || a.status === statusFilter;
      const matchCat =
        categoryFilter === "All" || a.category === categoryFilter;
      return matchText && matchStatus && matchCat;
    });
  }, [assets, q, statusFilter, categoryFilter]);

  // ── Open add / edit form ───────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm(emptyAssetForm);
    setSaveError(null);
    setOpenForm(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingId(asset.id);
    const { id, ...rest } = asset;
    setForm({
      ...rest,
      barcode: rest.barcode ?? "",
      assignedTo: rest.assignedTo ?? "",
      purchaseDate: rest.purchaseDate ?? "",
      warrantyEnd: rest.warrantyEnd ?? "",
    });
    setSaveError(null);
    setOpenForm(true);
  };

  // ── Validate ───────────────────────────────────────────────────────────────
  const validateForm = (): string | null => {
    if (!form.assetCode.trim()) return "Asset code is required.";
    if (!form.serialNo.trim()) return "Serial number is required.";
    if (!form.location.trim()) return "Location is required.";
    return null;
  };

  // ── Save (create or update) ────────────────────────────────────────────────
  const save = async () => {
    const err = validateForm();
    if (err) {
      setSaveError(err);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      if (editingId) {
        const updated = await updateAsset(editingId, form);
        setAssets((prev) =>
          prev.map((a) => (a.id === editingId ? updated : a)),
        );
      } else {
        const created = await createAsset(form);
        setAssets((prev) => [created, ...prev]);
      }
      setOpenForm(false);
    } catch {
      setSaveError("Failed to save asset. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await deleteAsset(deleteId);
      setAssets((prev) => prev.filter((a) => a.id !== deleteId));
      setDeleteId(null);
    } catch {
      setDeleteId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Barcode scan ───────────────────────────────────────────────────────────
  const findByBarcode = async (barcode: string) => {
    const code = barcode.trim();
    if (!code) return;

    setScanLoading(true);
    try {
      const found = await fetchAssetByScan(code);
      openEdit(found);
    } catch {
      // silently fail
    } finally {
      setScanLoading(false);
    }
  };

  const onScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      findByBarcode(scanValue);
      setScanValue("");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground">
            Register, scan, and manage CIC IT assets.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadAssets}
            disabled={pageLoading}
            title="Refresh"
            type="button"
          >
            {pageLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button onClick={openAdd} className="gap-2" type="button">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Barcode Scan Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            Barcode / QR Scan
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1 space-y-1">
            <div className="text-xs text-muted-foreground">
              Scan barcode (barcode / serial / asset code) and press Enter.
            </div>
            <Input
              ref={scanRef}
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={onScanKeyDown}
              placeholder="Scan here..."
              disabled={scanLoading}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={scanLoading || !scanValue.trim()}
              onClick={() => {
                findByBarcode(scanValue);
                setScanValue("");
              }}
            >
              {scanLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Find
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => scanRef.current?.focus()}
            >
              Focus Scan
            </Button>
          </div>
        </CardContent>
      </Card>

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
              placeholder="asset code, barcode, serial, model, location..."
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
                  <TableHead>Barcode</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serial No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading assets…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
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
                        {a.barcode || "-"}
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
                              type="button"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(a)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            {/* ── QR Code option ── */}
                            <DropdownMenuItem onClick={() => setQrAsset(a)}>
                              <QrCode className="mr-2 h-4 w-4" /> View QR Code
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteId(a.id)}
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Asset" : "Add Asset"}</DialogTitle>
          </DialogHeader>

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Asset Code *</div>
              <Input
                value={form.assetCode}
                onChange={(e) =>
                  setForm((p) => ({ ...p, assetCode: e.target.value }))
                }
                placeholder="CIC-IT-LAP-0001"
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Barcode (optional)
              </div>
              <Input
                value={form.barcode ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, barcode: e.target.value }))
                }
                placeholder="Scan barcode / enter value"
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Category</div>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                disabled={saving}
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
              <div className="text-xs text-muted-foreground">Status</div>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, status: v as AssetStatus }))
                }
                disabled={saving}
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
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Brand</div>
              <Input
                value={form.brand}
                onChange={(e) =>
                  setForm((p) => ({ ...p, brand: e.target.value }))
                }
                placeholder="Dell / HP / Lenovo"
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">Location *</div>
              <Input
                value={form.location}
                onChange={(e) =>
                  setForm((p) => ({ ...p, location: e.target.value }))
                }
                placeholder="HQ / IT / Room 02"
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenForm(false)}
              disabled={saving}
              type="button"
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} type="button">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              This action cannot be undone. The asset will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading} type="button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              type="button"
            >
              {deleteLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Dialog */}
      <QRDialog
        asset={qrAsset}
        open={!!qrAsset}
        onClose={() => setQrAsset(null)}
      />
    </div>
  );
}
