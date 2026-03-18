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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
  Package,
  MapPin,
  User,
  Building2,
  Calendar,
  ShieldCheck,
  Tag,
  Hash,
  Barcode,
  Info,
} from "lucide-react";

import { useAuth } from "@clerk/clerk-react";
import { useManagementApi } from "@/lib/management-api";
import { useAssetApi } from "@/lib/api";
import type { AssetsPage } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import type {
  Asset,
  AssetStatus,
  AssetFormState,
  Employee,
  Location,
  Supplier,
} from "@/types";
import { statusOptions, categoryOptions, emptyAssetForm } from "@/types";
import QRCodeLib from "qrcode";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const CUSTOM_CATEGORY_VALUE = "__CUSTOM_CATEGORY__";

// ─── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── Sorting ──────────────────────────────────────────────────────────────────
type SortKey =
  | "assetCode"
  | "category"
  | "brand"
  | "serialNo"
  | "status"
  | "location"
  | "supplierName";

type SortDir = "asc" | "desc";

function sortAssets(
  assets: Asset[],
  key: SortKey | null,
  dir: SortDir,
): Asset[] {
  if (!key) return assets;
  return [...assets].sort((a, b) => {
    const av = (a[key] ?? "").toString().toLowerCase();
    const bv = (b[key] ?? "").toString().toLowerCase();
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

// ─── Sortable column header ───────────────────────────────────────────────────
interface SortableHeadProps {
  label: string;
  sortKey: SortKey;
  current: SortKey | null;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}

const SortableHead = React.memo(function SortableHead({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: SortableHeadProps) {
  const active = current === sortKey;
  const handleClick = React.useCallback(
    () => onSort(sortKey),
    [onSort, sortKey],
  );

  return (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={handleClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5 text-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-foreground" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </span>
    </TableHead>
  );
});

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = React.memo(function StatusBadge({
  status,
}: {
  status: AssetStatus;
}) {
  const variant =
    status === "Available"
      ? "secondary"
      : status === "Assigned"
        ? "default"
        : status === "In Repair"
          ? "destructive"
          : "outline";

  return <Badge variant={variant}>{status}</Badge>;
});

// ─── QR Dialog ────────────────────────────────────────────────────────────────
interface QRDialogProps {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
}

const QRDialog = React.memo(function QRDialog({
  asset,
  open,
  onClose,
}: QRDialogProps) {
  const canvasElRef = React.useRef<HTMLCanvasElement | null>(null);

  const qrPayload = React.useMemo(
    () =>
      asset
        ? JSON.stringify({
            assetCode: asset.assetCode,
            serialNo: asset.serialNo,
            ...(asset.barcode ? { barcode: asset.barcode } : {}),
            brand: asset.brand,
            model: asset.model,
          })
        : "",
    [asset],
  );

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
    [asset, qrPayload],
  );

  const handleDownload = React.useCallback(() => {
    if (!canvasElRef.current || !asset) return;
    const url = canvasElRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR_${asset.assetCode}.png`;
    a.click();
  }, [asset]);

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4" /> QR Code — {asset.assetCode}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-lg border bg-white p-3 shadow-inner">
            <canvas ref={canvasCallbackRef} />
          </div>

          <div className="w-full space-y-1 rounded-md bg-muted/50 px-4 py-3 text-sm">
            {(
              [
                ["Asset Code", asset.assetCode],
                ["Serial No", asset.serialNo],
                ...(asset.barcode ? [["Barcode", asset.barcode]] : []),
                ["Model", `${asset.brand} ${asset.model}`],
                ["Location", asset.location],
                ...(asset.supplierName
                  ? [["Supplier", asset.supplierName]]
                  : []),
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} type="button">
            Close
          </Button>
          <Button onClick={handleDownload} className="gap-2" type="button">
            <Download className="h-4 w-4" /> Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// ─── Asset Detail Sheet ───────────────────────────────────────────────────────
interface AssetDetailSheetProps {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
  onViewQR: (asset: Asset) => void;
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-all text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

const AssetDetailSheet = React.memo(function AssetDetailSheet({
  asset,
  open,
  onClose,
  onEdit,
  onDelete,
  onViewQR,
}: AssetDetailSheetProps) {
  const handleEdit = React.useCallback(() => {
    if (asset) {
      onEdit(asset);
      onClose();
    }
  }, [asset, onEdit, onClose]);

  const handleDelete = React.useCallback(() => {
    if (asset) {
      onDelete(asset.id);
      onClose();
    }
  }, [asset, onDelete, onClose]);

  const handleQR = React.useCallback(() => {
    if (asset) {
      onViewQR(asset);
      onClose();
    }
  }, [asset, onViewQR, onClose]);

  if (!asset) return null;

  const warrantyStatus = (() => {
    if (!asset.warrantyEnd) return null;
    const end = new Date(asset.warrantyEnd);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
    if (diffDays < 0) return { label: "Expired", color: "text-destructive" };
    if (diffDays <= 30)
      return { label: `Expires in ${diffDays}d`, color: "text-amber-500" };
    return { label: "Active", color: "text-green-600" };
  })();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {/* Header */}
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SheetTitle className="truncate text-base">
                  {asset.assetCode}
                </SheetTitle>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {asset.brand} {asset.model}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <StatusBadge status={asset.status} />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Identity section */}
          <div className="px-6 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Identity
            </p>
            <div className="space-y-3">
              <DetailRow
                icon={Tag}
                label="Asset Code"
                value={asset.assetCode}
              />
              <DetailRow
                icon={Hash}
                label="Serial Number"
                value={asset.serialNo}
              />
              <DetailRow icon={Barcode} label="Barcode" value={asset.barcode} />
              <DetailRow icon={Info} label="Category" value={asset.category} />
              <DetailRow
                icon={Package}
                label="Model"
                value={
                  `${asset.brand ?? ""} ${asset.model ?? ""}`.trim() ||
                  undefined
                }
              />
            </div>
          </div>

          <Separator />

          {/* Assignment section */}
          <div className="px-6 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Assignment
            </p>
            <div className="space-y-3">
              <DetailRow
                icon={MapPin}
                label="Location"
                value={asset.location}
              />
              <DetailRow
                icon={User}
                label="Assigned To"
                value={asset.assignedTo}
              />
            </div>
            {!asset.assignedTo && (
              <p className="mt-2 text-xs text-muted-foreground italic">
                Not assigned to any employee
              </p>
            )}
          </div>

          <Separator />

          {/* Procurement section */}
          <div className="px-6 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Procurement
            </p>
            <div className="space-y-3">
              <DetailRow
                icon={Building2}
                label="Supplier"
                value={asset.supplierName}
              />
              <DetailRow
                icon={Calendar}
                label="Purchase Date"
                value={
                  asset.purchaseDate
                    ? new Date(asset.purchaseDate).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )
                    : undefined
                }
              />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Warranty End</p>
                  {asset.warrantyEnd ? (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {new Date(asset.warrantyEnd).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </p>
                      {warrantyStatus && (
                        <span
                          className={`text-xs font-medium ${warrantyStatus.color}`}
                        >
                          ({warrantyStatus.label})
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">—</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <Button className="flex-1 gap-2" onClick={handleEdit} type="button">
              <Pencil className="h-3.5 w-3.5" /> Edit Asset
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleQR}
              type="button"
            >
              <QrCode className="h-3.5 w-3.5" /> QR Code
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              type="button"
              title="Delete asset"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});

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

  const handlePageSizeChange = React.useCallback(
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
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Assets() {
  const { isLoaded, isSignedIn } = useAuth();
  const managementApi = useManagementApi();
  const { getPage, getByScan, create, update, remove } = useAssetApi();

  const [pageData, setPageData] = React.useState<AssetsPage>({
    content: [],
    totalElements: 0,
    totalPages: 1,
    number: 0,
    size: 25,
  });

  const [locations, setLocations] = React.useState<Location[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);

  const [pageLoading, setPageLoading] = React.useState(true);
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [scanLoading, setScanLoading] = React.useState(false);

  // Raw search value (immediate) — debounced for filtering
  const [qRaw, setQRaw] = React.useState("");
  const q = useDebounce(qRaw, 300);

  const [statusFilter, setStatusFilter] = React.useState<AssetStatus | "All">(
    "All",
  );
  const [categoryFilter, setCategoryFilter] = React.useState<string>("All");
  const [supplierFilter, setSupplierFilter] = React.useState<string>("All");

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  const [sortKey, setSortKey] = React.useState<SortKey | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  const handleSort = React.useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const [scanValue, setScanValue] = React.useState("");
  const scanRef = React.useRef<HTMLInputElement | null>(null);

  const [openForm, setOpenForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<AssetFormState>(emptyAssetForm);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [qrAsset, setQrAsset] = React.useState<Asset | null>(null);

  // Detail sheet state
  const [detailAsset, setDetailAsset] = React.useState<Asset | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const [customCategory, setCustomCategory] = React.useState("");
  const [allCategoryOptions, setAllCategoryOptions] =
    React.useState<string[]>(categoryOptions);

  const lookupsLoadedRef = React.useRef(false);
  const loadingRef = React.useRef(false);

  // ── Fetch page ─────────────────────────────────────────────────────────────
  const loadPage = React.useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setPageData({
        content: [],
        totalElements: 0,
        totalPages: 1,
        number: 0,
        size: pageSize,
      });
      setPageLoading(false);
      return;
    }

    if (loadingRef.current) return;
    loadingRef.current = true;
    setPageLoading(true);

    try {
      const data = await getPage({ page: page - 1, size: pageSize });
      setPageData({
        content: Array.isArray(data?.content) ? data.content : [],
        totalElements: data?.totalElements ?? 0,
        totalPages: data?.totalPages ?? 1,
        number: data?.number ?? 0,
        size: data?.size ?? pageSize,
      });
    } catch (err) {
      console.error("loadPage failed:", err);
      setPageData({
        content: [],
        totalElements: 0,
        totalPages: 1,
        number: 0,
        size: pageSize,
      });
    } finally {
      setPageLoading(false);
      loadingRef.current = false;
    }
  }, [isLoaded, isSignedIn, getPage, page, pageSize]);

  React.useEffect(() => {
    loadPage();
  }, [loadPage]);

  // ── Dynamic categories ─────────────────────────────────────────────────────
  React.useEffect(() => {
    const categoriesFromAssets = pageData.content
      .map((a) => a.category?.trim())
      .filter((c): c is string => !!c);

    const merged = Array.from(
      new Set([...categoryOptions, ...categoriesFromAssets]),
    ).sort((a, b) => a.localeCompare(b));

    setAllCategoryOptions(merged);
  }, [pageData.content]);

  // ── Load lookups ───────────────────────────────────────────────────────────
  const loadLookups = React.useCallback(
    async (force = false) => {
      if (!isLoaded || !isSignedIn) {
        setLocations([]);
        setEmployees([]);
        setSuppliers([]);
        return;
      }

      if (lookupsLoadedRef.current && !force) return;

      setLookupLoading(true);
      try {
        const data = await managementApi.loadAssetLookups();
        setLocations(Array.isArray(data?.locations) ? data.locations : []);
        setEmployees(Array.isArray(data?.employees) ? data.employees : []);
        setSuppliers(Array.isArray(data?.suppliers) ? data.suppliers : []);
        lookupsLoadedRef.current = true;
      } catch (err) {
        console.error("loadLookups failed:", err);
        setLocations([]);
        setEmployees([]);
        setSuppliers([]);
      } finally {
        setLookupLoading(false);
      }
    },
    [isLoaded, isSignedIn, managementApi],
  );

  React.useEffect(() => {
    if (isLoaded && isSignedIn) lookupsLoadedRef.current = false;
  }, [isLoaded, isSignedIn]);

  React.useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  React.useEffect(() => {
    if (openForm) loadLookups();
  }, [openForm, loadLookups]);

  React.useEffect(() => {
    scanRef.current?.focus();
  }, []);

  // ── Filter then sort ───────────────────────────────────────────────────────
  const filteredAssets = React.useMemo(() => {
    const searchText = q.trim().toLowerCase();

    const filtered = pageData.content.filter((asset) => {
      const matchesSearch =
        !searchText ||
        asset.assetCode?.toLowerCase().includes(searchText) ||
        asset.barcode?.toLowerCase().includes(searchText) ||
        asset.serialNo?.toLowerCase().includes(searchText) ||
        asset.brand?.toLowerCase().includes(searchText) ||
        asset.model?.toLowerCase().includes(searchText) ||
        asset.category?.toLowerCase().includes(searchText) ||
        asset.location?.toLowerCase().includes(searchText) ||
        asset.assignedTo?.toLowerCase().includes(searchText) ||
        asset.supplierName?.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "All" || asset.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All" || asset.category === categoryFilter;

      const matchesSupplier =
        supplierFilter === "All" || String(asset.supplierId) === supplierFilter;

      return (
        matchesSearch && matchesStatus && matchesCategory && matchesSupplier
      );
    });

    return sortAssets(filtered, sortKey, sortDir);
  }, [
    pageData.content,
    q,
    statusFilter,
    categoryFilter,
    supplierFilter,
    sortKey,
    sortDir,
  ]);

  // ── Detail sheet ───────────────────────────────────────────────────────────
  const openDetail = React.useCallback((asset: Asset) => {
    setDetailAsset(asset);
    setDetailOpen(true);
  }, []);

  const closeDetail = React.useCallback(() => {
    setDetailOpen(false);
  }, []);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const openAdd = React.useCallback(() => {
    setEditingId(null);
    setForm(emptyAssetForm);
    setCustomCategory("");
    setSaveError(null);
    setOpenForm(true);
  }, []);

  const openEdit = React.useCallback(
    (asset: Asset) => {
      setEditingId(asset.id);

      const matchingLocation = locations.find(
        (loc) => loc.name?.trim() === asset.location?.trim(),
      );
      const matchingEmployee = employees.find(
        (emp) =>
          `${emp.empId} - ${emp.name}`.trim() === asset.assignedTo?.trim(),
      );
      const existingCategory = asset.category ?? "Laptop";
      const isPredefinedCategory =
        allCategoryOptions.includes(existingCategory);
      const matchingSupplier =
        suppliers.find((s) => s.id === asset.supplierId) ??
        suppliers.find((s) => s.name?.trim() === asset.supplierName?.trim());

      setForm({
        assetCode: asset.assetCode ?? "",
        barcode: asset.barcode ?? "",
        category: isPredefinedCategory
          ? existingCategory
          : CUSTOM_CATEGORY_VALUE,
        brand: asset.brand ?? "",
        model: asset.model ?? "",
        serialNo: asset.serialNo ?? "",
        status: asset.status ?? "Available",
        locationId: matchingLocation ? String(matchingLocation.id) : "",
        assignedToId: matchingEmployee ? String(matchingEmployee.id) : "",
        supplierId: matchingSupplier ? String(matchingSupplier.id) : "",
        purchaseDate: asset.purchaseDate ?? "",
        warrantyEnd: asset.warrantyEnd ?? "",
      });

      setCustomCategory(isPredefinedCategory ? "" : existingCategory);
      setSaveError(null);
      setOpenForm(true);
    },
    [locations, employees, suppliers, allCategoryOptions],
  );

  const validateForm = React.useCallback((): string | null => {
    if (!form.assetCode.trim()) return "Asset code is required.";
    if (!form.serialNo.trim()) return "Serial number is required.";
    if (!form.locationId.trim()) return "Location is required.";
    if (!form.supplierId?.trim()) return "Supplier is required.";
    if (form.category === CUSTOM_CATEGORY_VALUE && !customCategory.trim()) {
      return "Custom category is required.";
    }
    return null;
  }, [form, customCategory]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = React.useCallback(async () => {
    const err = validateForm();
    if (err) {
      setSaveError(err);
      return;
    }

    if (!isLoaded || !isSignedIn) {
      setSaveError("You are not signed in.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const finalCategory =
      form.category === CUSTOM_CATEGORY_VALUE
        ? customCategory.trim()
        : form.category;

    const payload: AssetFormState = { ...form, category: finalCategory };

    try {
      if (editingId) {
        await update(editingId, payload);
      } else {
        await create(payload);
        setPage(1);
      }

      if (finalCategory && !allCategoryOptions.includes(finalCategory)) {
        setAllCategoryOptions((prev) =>
          [...prev, finalCategory].sort((a, b) => a.localeCompare(b)),
        );
      }

      setOpenForm(false);
      setForm(emptyAssetForm);
      setCustomCategory("");
      await loadPage();
    } catch (e) {
      console.error("save asset failed:", e);
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to save asset. Please try again.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }, [
    validateForm,
    isLoaded,
    isSignedIn,
    form,
    customCategory,
    editingId,
    update,
    create,
    allCategoryOptions,
    loadPage,
  ]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = React.useCallback(async () => {
    if (!deleteId || !isLoaded || !isSignedIn) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await remove(deleteId);
      setDeleteId(null);
      setDeleteError(null);

      if (pageData.content.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await loadPage();
      }
    } catch (e: unknown) {
      console.error("delete failed:", e);

      let message = "Failed to delete asset!";

      if (e instanceof Error) {
        const backendMessage = e.message?.trim() || "";
        const lowerMsg = backendMessage.toLowerCase();

        if (
          lowerMsg.includes("foreign key") ||
          lowerMsg.includes("constraint") ||
          lowerMsg.includes("reference") ||
          lowerMsg.includes("child record") ||
          lowerMsg.includes("linked") ||
          lowerMsg.includes("used in another record")
        ) {
          message =
            "Failed to delete asset! This asset is linked to other records.";
        } else if (backendMessage) {
          message = backendMessage;
        }
      }

      setDeleteError(message);
    } finally {
      setDeleteLoading(false);
    }
  }, [
    deleteId,
    isLoaded,
    isSignedIn,
    remove,
    pageData.content.length,
    page,
    loadPage,
  ]);

  // ── Barcode scan ───────────────────────────────────────────────────────────
  const findByBarcode = React.useCallback(
    async (barcode: string) => {
      const code = barcode.trim();
      if (!code || !isLoaded || !isSignedIn) return;

      setScanLoading(true);
      try {
        const found = await getByScan(code);
        await loadLookups();
        openEdit(found);
      } catch (e) {
        console.error("scan failed:", e);
      } finally {
        setScanLoading(false);
      }
    },
    [isLoaded, isSignedIn, getByScan, loadLookups, openEdit],
  );

  const onScanKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        findByBarcode(scanValue);
        setScanValue("");
      }
    },
    [findByBarcode, scanValue],
  );

  const handleFindClick = React.useCallback(() => {
    findByBarcode(scanValue);
    setScanValue("");
  }, [findByBarcode, scanValue]);

  const handleFocusScan = React.useCallback(() => {
    scanRef.current?.focus();
  }, []);

  const handleClearSort = React.useCallback(() => {
    setSortKey(null);
    setSortDir("asc");
  }, []);

  // ── Row click handler ──────────────────────────────────────────────────────
  const handleRowClick = React.useCallback(
    (asset: Asset) => {
      openDetail(asset);
    },
    [openDetail],
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
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
            onClick={loadPage}
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
            <Plus className="h-4 w-4" /> Add Asset
          </Button>
        </div>
      </div>

      {/* ── Scan Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4" /> Barcode / QR Scan
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
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
              onClick={handleFindClick}
            >
              {scanLoading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Find
            </Button>

            <Button type="button" variant="outline" onClick={handleFocusScan}>
              Focus Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Filters Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search & Filters</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Search</div>
            <Input
              value={qRaw}
              onChange={(e) => setQRaw(e.target.value)}
              placeholder="asset code, serial, model, supplier..."
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
                {allCategoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Supplier</div>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {suppliers.length === 0 ? (
                  <SelectItem value="__NONE__" disabled>
                    {lookupLoading ? "Loading…" : "No suppliers registered"}
                  </SelectItem>
                ) : (
                  suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Asset Table Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              Asset List{" "}
              <span className="text-muted-foreground">
                ({filteredAssets.length})
              </span>
            </CardTitle>
            {sortKey && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleClearSort}
                type="button"
              >
                Clear sort
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="mx-6 rounded-t-md border-x border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label="Asset Code"
                    sortKey="assetCode"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <TableHead>Barcode</TableHead>
                  <SortableHead
                    label="Category"
                    sortKey="category"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Model"
                    sortKey="brand"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Serial No"
                    sortKey="serialNo"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Status"
                    sortKey="status"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Location"
                    sortKey="location"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Supplier"
                    sortKey="supplierName"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {pageLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading
                        assets...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No assets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((a) => (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => handleRowClick(a)}
                    >
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
                      <TableCell className="text-muted-foreground">
                        {a.supplierName || "-"}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                            <DropdownMenuItem onClick={() => openDetail(a)}>
                              <Info className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                await loadLookups();
                                openEdit(a);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setQrAsset(a)}>
                              <QrCode className="mr-2 h-4 w-4" /> View QR Code
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteId(a.id);
                              }}
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

          <div className="mx-6 rounded-b-md border-x border-b">
            <PaginationControls
              total={pageData.totalElements}
              page={page}
              pageSize={pageSize}
              totalPages={pageData.totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Asset Detail Sheet ── */}
      <AssetDetailSheet
        asset={detailAsset}
        open={detailOpen}
        onClose={closeDetail}
        onEdit={async (asset) => {
          await loadLookups();
          openEdit(asset);
        }}
        onDelete={(id) => {
          setDeleteError(null);
          setDeleteId(id);
        }}
        onViewQR={setQrAsset}
      />

      {/* ── Add / Edit Dialog ── */}
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
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {allCategoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_CATEGORY_VALUE}>
                    Other / Add New Category
                  </SelectItem>
                </SelectContent>
              </Select>
              {form.category === CUSTOM_CATEGORY_VALUE && (
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter new category"
                  disabled={saving}
                />
              )}
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

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Location *</div>
              <Select
                value={form.locationId || ""}
                onValueChange={(v) => setForm((p) => ({ ...p, locationId: v }))}
                disabled={saving || lookupLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      lookupLoading ? "Loading locations..." : "Select location"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {locations.length === 0 && !lookupLoading ? (
                    <SelectItem value="__NO_LOCATION__" disabled>
                      No locations available
                    </SelectItem>
                  ) : (
                    locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {loc.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Assigned To (optional)
              </div>
              <Select
                value={
                  form.assignedToId?.trim() ? form.assignedToId : "__NONE__"
                }
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    assignedToId: v === "__NONE__" ? "" : v,
                  }))
                }
                disabled={saving || lookupLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      lookupLoading ? "Loading employees..." : "Select employee"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">Not Assigned</SelectItem>
                  {employees.length === 0 && !lookupLoading ? (
                    <SelectItem value="__NO_EMPLOYEE__" disabled>
                      No employees available
                    </SelectItem>
                  ) : (
                    employees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.empId} - {emp.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Supplier *</div>
              <Select
                value={form.supplierId?.trim() ? form.supplierId : ""}
                onValueChange={(v) => setForm((p) => ({ ...p, supplierId: v }))}
                disabled={saving || lookupLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      lookupLoading ? "Loading suppliers..." : "Select supplier"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.length === 0 && !lookupLoading ? (
                    <SelectItem value="__NO_SUPPLIER__" disabled>
                      No suppliers registered
                    </SelectItem>
                  ) : (
                    suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                        {s.phone && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {s.phone}
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
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

      {/* ── Delete Confirm ── */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) {
            setDeleteId(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The asset will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteLoading}
              type="button"
              onClick={() => {
                setDeleteId(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteLoading}
              type="button"
            >
              {deleteLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── QR Dialog ── */}
      <QRDialog
        asset={qrAsset}
        open={!!qrAsset}
        onClose={() => setQrAsset(null)}
      />
    </div>
  );
}
