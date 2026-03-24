// src/pages/ReportsPage.tsx
import * as React from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Download,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  Wrench,
  TrendingUp,
  MapPin,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown as ComboIcon } from "lucide-react";

import type { Asset, Maintenance } from "@/types";
import { useAssetApi } from "@/lib/api";
import { useMaintenanceApi } from "@/lib/maintainance-api";
import {
  generateAssetReport,
  generateMaintenanceReport,
  generateFilteredAssetReport,
  generateAssetReportExcel,
  generateMaintenanceReportExcel,
  generateFilteredAssetReportExcel,
} from "@/utils/pdfReports";

// ─── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#a855f7"] as const;

// Asset status options — kept in sync with your data model
const ASSET_STATUS_OPTIONS = [
  "Available",
  "Assigned",
  "In Repair",
  "Disposed",
  "Damaged",
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────────
type ChartRow = { name: string; value: number };

// ─── Helpers ────────────────────────────────────────────────────────────────────
function buildCountData<T extends string>(items: T[]): ChartRow[] {
  const map: Record<string, number> = {};
  for (const x of items) map[x] = (map[x] ?? 0) + 1;
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

interface FilterParams {
  supplierName?: string;
  location?: string;
  assignedTo?: string;
  status?: string;
  purchaseDateFrom?: string;
  purchaseDateTo?: string;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

const StatusBadge = React.memo(function StatusBadge({
  status,
}: {
  status: string;
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

// ─── KPI Card — matches Dashboard style exactly ────────────────────────────────
interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  loading?: boolean;
}

const KpiCard = React.memo(function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {loading ? "Loading…" : (sub ?? "Live from server")}
        </p>
      </CardContent>
    </Card>
  );
});

// ─── Chart Card ────────────────────────────────────────────────────────────────
interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  empty: boolean;
  loading?: boolean;
}

const ChartCard = React.memo(function ChartCard({
  title,
  children,
  empty,
  loading,
}: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : empty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
});

// ─── Filter Pill ───────────────────────────────────────────────────────────────
const FilterPill = React.memo(function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full hover:text-destructive"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
});

// ─── Searchable Combobox ──────────────────────────────────────────────────────
interface ComboboxProps {
  value: string;
  onValueChange: (v: string) => void;
  options: string[];
  placeholder: string;
  allLabel: string;
  allValue?: string;
  searchPlaceholder?: string;
}

const SearchCombobox = React.memo(function SearchCombobox({
  value,
  onValueChange,
  options,
  allLabel,
  allValue = "All",
  searchPlaceholder = "Search…",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.toLowerCase().includes(t));
  }, [options, search]);

  const displayLabel = value === allValue ? allLabel : value || allLabel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          type="button"
        >
          <span className="truncate text-sm">{displayLabel}</span>
          <ComboIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={allValue}
                onSelect={() => {
                  onValueChange(allValue);
                  setSearch("");
                  setOpen(false);
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${value === allValue ? "opacity-100" : "opacity-0"}`}
                />
                {allLabel}
              </CommandItem>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onValueChange(opt);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${value === opt ? "opacity-100" : "opacity-0"}`}
                  />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

// ─── Pagination Controls ───────────────────────────────────────────────────────
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { getAll: getAllAssets } = useAssetApi();
  const { getAll: getAllMaintenance } = useMaintenanceApi();

  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [maintenance, setMaintenance] = React.useState<Maintenance[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [filterSupplier, setFilterSupplier] = React.useState("All");
  const [filterLocation, setFilterLocation] = React.useState("All");
  const [filterAssignedTo, setFilterAssignedTo] = React.useState("All");
  const [filterStatus, setFilterStatus] = React.useState("All"); // ← NEW
  const [filterDateFrom, setFilterDateFrom] = React.useState("");
  const [filterDateTo, setFilterDateTo] = React.useState("");

  // ── Pagination state ──────────────────────────────────────────────────────────
  const [tablePage, setTablePage] = React.useState(1);
  const [tablePageSize, setTablePageSize] = React.useState(25);

  // Reset page when filters change
  React.useEffect(() => {
    setTablePage(1);
  }, [
    filterSupplier,
    filterLocation,
    filterAssignedTo,
    filterStatus, // ← NEW
    filterDateFrom,
    filterDateTo,
  ]);

  // ── Fetch — use refs to avoid unstable API function references ───────────────
  const getAllAssetsRef = React.useRef(getAllAssets);
  const getAllMaintenanceRef = React.useRef(getAllMaintenance);
  React.useEffect(() => {
    getAllAssetsRef.current = getAllAssets;
  }, [getAllAssets]);
  React.useEffect(() => {
    getAllMaintenanceRef.current = getAllMaintenance;
  }, [getAllMaintenance]);

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetList, maintenancePage] = await Promise.all([
        getAllAssetsRef.current(),
        getAllMaintenanceRef.current(0, 1000),
      ]);
      setAssets(Array.isArray(assetList) ? assetList : []);
      setMaintenance(maintenancePage.content ?? []);
    } catch (e) {
      console.error("Failed to load report data:", e);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []); // stable — no API deps, uses refs

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Derived dropdown options ──────────────────────────────────────────────────
  const supplierOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          assets.map((a) => a.supplierName).filter((n): n is string => !!n),
        ),
      ).sort(),
    [assets],
  );

  const locationOptions = React.useMemo(
    () =>
      Array.from(
        new Set(assets.map((a) => a.location).filter((n): n is string => !!n)),
      ).sort(),
    [assets],
  );

  const assignedToOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          assets
            .map((a) => a.assignedTo)
            .filter((n): n is string => !!n && n.trim() !== ""),
        ),
      ).sort(),
    [assets],
  );

  // Status options — only include statuses that actually appear in the dataset
  const statusOptions = React.useMemo(() => {
    const present = new Set(assets.map((a) => a.status));
    return ASSET_STATUS_OPTIONS.filter((s) => present.has(s));
  }, [assets]);

  // ── KPI numbers ───────────────────────────────────────────────────────────────
  const kpiData = React.useMemo(() => {
    const assigned = assets.filter((a) => a.status === "Assigned").length;
    const inRepair = assets.filter((a) => a.status === "In Repair").length;
    const openMaintenance = maintenance.filter(
      (m) => m.status === "Open" || m.status === "In Progress",
    ).length;
    const uniqueLocations = new Set(assets.map((a) => a.location)).size;
    return { assigned, inRepair, openMaintenance, uniqueLocations };
  }, [assets, maintenance]);

  // ── Chart data ────────────────────────────────────────────────────────────────
  const assetStatusData = React.useMemo(
    () => buildCountData(assets.map((a) => a.status)),
    [assets],
  );
  const assetCategoryData = React.useMemo(
    () => buildCountData(assets.map((a) => a.category)),
    [assets],
  );
  const maintenanceStatusData = React.useMemo(
    () => buildCountData(maintenance.map((m) => m.status)),
    [maintenance],
  );
  const maintenancePriorityData = React.useMemo(
    () => buildCountData(maintenance.map((m) => m.priority)),
    [maintenance],
  );

  // ── Filtered assets ───────────────────────────────────────────────────────────
  const filteredAssets = React.useMemo(
    () =>
      assets.filter((a) => {
        if (filterSupplier !== "All" && a.supplierName !== filterSupplier)
          return false;
        if (filterLocation !== "All" && a.location !== filterLocation)
          return false;
        if (filterAssignedTo !== "All" && a.assignedTo !== filterAssignedTo)
          return false;
        if (filterStatus !== "All" && a.status !== filterStatus)
          // ← NEW
          return false;
        if (
          filterDateFrom &&
          (a.purchaseDate == null || a.purchaseDate < filterDateFrom)
        )
          return false;
        if (
          filterDateTo &&
          (a.purchaseDate == null || a.purchaseDate > filterDateTo)
        )
          return false;
        return true;
      }),
    [
      assets,
      filterSupplier,
      filterLocation,
      filterAssignedTo,
      filterStatus, // ← NEW
      filterDateFrom,
      filterDateTo,
    ],
  );

  const tableTotalPages = Math.max(
    Math.ceil(filteredAssets.length / tablePageSize),
    1,
  );

  const paginatedAssets = React.useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return filteredAssets.slice(start, start + tablePageSize);
  }, [filteredAssets, tablePage, tablePageSize]);

  // ── Active filters ────────────────────────────────────────────────────────────
  const activeFilters = React.useMemo(
    () =>
      [
        filterSupplier !== "All" && {
          label: `Supplier: ${filterSupplier}`,
          onRemove: () => setFilterSupplier("All"),
        },
        filterLocation !== "All" && {
          label: `Location: ${filterLocation}`,
          onRemove: () => setFilterLocation("All"),
        },
        filterAssignedTo !== "All" && {
          label: `Assigned To: ${filterAssignedTo}`,
          onRemove: () => setFilterAssignedTo("All"),
        },
        filterStatus !== "All" && {
          // ← NEW
          label: `Status: ${filterStatus}`,
          onRemove: () => setFilterStatus("All"),
        },
        filterDateFrom && {
          label: `From: ${filterDateFrom}`,
          onRemove: () => setFilterDateFrom(""),
        },
        filterDateTo && {
          label: `To: ${filterDateTo}`,
          onRemove: () => setFilterDateTo(""),
        },
      ].filter(Boolean) as { label: string; onRemove: () => void }[],
    [
      filterSupplier,
      filterLocation,
      filterAssignedTo,
      filterStatus, // ← NEW
      filterDateFrom,
      filterDateTo,
    ],
  );

  const hasActiveFilters = activeFilters.length > 0;

  const clearFilters = React.useCallback(() => {
    setFilterSupplier("All");
    setFilterLocation("All");
    setFilterAssignedTo("All");
    setFilterStatus("All"); // ← NEW
    setFilterDateFrom("");
    setFilterDateTo("");
  }, []);

  // ── Filter params (stable for download handlers) ───────────────────────────
  const filterParams = React.useMemo<FilterParams>(
    () => ({
      supplierName: filterSupplier !== "All" ? filterSupplier : undefined,
      location: filterLocation !== "All" ? filterLocation : undefined,
      assignedTo: filterAssignedTo !== "All" ? filterAssignedTo : undefined,
      status: filterStatus !== "All" ? filterStatus : undefined, // ← NEW
      purchaseDateFrom: filterDateFrom || undefined,
      purchaseDateTo: filterDateTo || undefined,
    }),
    [
      filterSupplier,
      filterLocation,
      filterAssignedTo,
      filterStatus, // ← NEW
      filterDateFrom,
      filterDateTo,
    ],
  );

  const handleDownloadFilteredPdf = React.useCallback(() => {
    generateFilteredAssetReport(filteredAssets, filterParams);
  }, [filteredAssets, filterParams]);

  const handleDownloadFilteredExcel = React.useCallback(() => {
    generateFilteredAssetReportExcel(filteredAssets, filterParams);
  }, [filteredAssets, filterParams]);

  const handleDownloadAssetsPdf = React.useCallback(
    () => generateAssetReport(assets),
    [assets],
  );
  const handleDownloadAssetsExcel = React.useCallback(
    () => generateAssetReportExcel(assets),
    [assets],
  );
  const handleDownloadMaintenancePdf = React.useCallback(
    () => generateMaintenanceReport(maintenance),
    [maintenance],
  );
  const handleDownloadMaintenanceExcel = React.useCallback(
    () => generateMaintenanceReportExcel(maintenance),
    [maintenance],
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Summary statistics and downloadable reports.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={fetchAll}
            variant="outline"
            className="gap-2"
            type="button"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={handleDownloadAssetsPdf}
            className="gap-2"
            type="button"
            disabled={loading || assets.length === 0}
          >
            <Download className="h-4 w-4" />
            Assets PDF
          </Button>
          <Button
            onClick={handleDownloadAssetsExcel}
            variant="outline"
            className="gap-2"
            type="button"
            disabled={loading || assets.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Assets Excel
          </Button>
          <Button
            onClick={handleDownloadMaintenancePdf}
            variant="secondary"
            className="gap-2"
            type="button"
            disabled={loading || maintenance.length === 0}
          >
            <FileText className="h-4 w-4" />
            Maintenance PDF
          </Button>
          <Button
            onClick={handleDownloadMaintenanceExcel}
            variant="outline"
            className="gap-2"
            type="button"
            disabled={loading || maintenance.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Maintenance Excel
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── KPI Summary ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Package}
          label="Total Assets"
          value={assets.length}
          sub={`${kpiData.assigned} assigned`}
          loading={loading}
        />
        <KpiCard
          icon={TrendingUp}
          label="In Repair"
          value={kpiData.inRepair}
          sub="currently being serviced"
          loading={loading}
        />
        <KpiCard
          icon={Wrench}
          label="Open Maintenance"
          value={kpiData.openMaintenance}
          sub={`of ${maintenance.length} total`}
          loading={loading}
        />
        <KpiCard
          icon={MapPin}
          label="Locations"
          value={kpiData.uniqueLocations}
          sub="unique sites"
          loading={loading}
        />
      </div>

      {/* ── Charts Row 1 ─────────────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Asset Status Distribution"
          empty={assetStatusData.length === 0}
          loading={loading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assetStatusData}
                dataKey="value"
                nameKey="name"
                outerRadius={110}
                label
              >
                {assetStatusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Assets by Category"
          empty={assetCategoryData.length === 0}
          loading={loading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assetCategoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts Row 2 ─────────────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Maintenance by Status"
          empty={maintenanceStatusData.length === 0}
          loading={loading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={maintenanceStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Maintenance by Priority"
          empty={maintenancePriorityData.length === 0}
          loading={loading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={maintenancePriorityData}
                dataKey="value"
                nameKey="name"
                outerRadius={110}
                label
              >
                {maintenancePriorityData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Filtered Asset Report ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Filtered Asset Report</CardTitle>
              {hasActiveFilters && (
                <span className="text-xs text-muted-foreground">
                  — {filteredAssets.length} result
                  {filteredAssets.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  type="button"
                >
                  Clear all
                </Button>
              )}
              <Button
                size="sm"
                className="gap-2"
                onClick={handleDownloadFilteredPdf}
                type="button"
                disabled={filteredAssets.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleDownloadFilteredExcel}
                type="button"
                disabled={filteredAssets.length === 0}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Download Excel
              </Button>
            </div>
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activeFilters.map((f) => (
                <FilterPill
                  key={f.label}
                  label={f.label}
                  onRemove={f.onRemove}
                />
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filter controls — 6 columns to accommodate the new Status filter */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Supplier</div>
              <SearchCombobox
                value={filterSupplier}
                onValueChange={setFilterSupplier}
                options={supplierOptions}
                placeholder="All Suppliers"
                allLabel="All Suppliers"
                searchPlaceholder="Search suppliers…"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Location</div>
              <SearchCombobox
                value={filterLocation}
                onValueChange={setFilterLocation}
                options={locationOptions}
                placeholder="All Locations"
                allLabel="All Locations"
                searchPlaceholder="Search locations…"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Assigned To</div>
              <SearchCombobox
                value={filterAssignedTo}
                onValueChange={setFilterAssignedTo}
                options={assignedToOptions}
                placeholder="All Employees"
                allLabel="All Employees"
                searchPlaceholder="Search employees…"
              />
            </div>

            {/* ── Asset Status filter (NEW) ── */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Status</div>
              <SearchCombobox
                value={filterStatus}
                onValueChange={setFilterStatus}
                options={statusOptions}
                placeholder="All Statuses"
                allLabel="All Statuses"
                searchPlaceholder="Search status…"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Purchase Date From
              </div>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Purchase Date To
              </div>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Results table */}
          <div className="rounded-md border">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Code</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Serial No</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Purchase Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAssets.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No assets match the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAssets.map((a) => (
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
                          <TableCell className="text-muted-foreground">
                            {a.assignedTo || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {a.purchaseDate ?? "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <PaginationControls
                  total={filteredAssets.length}
                  page={tablePage}
                  pageSize={tablePageSize}
                  totalPages={tableTotalPages}
                  onPageChange={setTablePage}
                  onPageSizeChange={setTablePageSize}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
