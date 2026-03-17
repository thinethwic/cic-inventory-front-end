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

type ChartRow = { name: string; value: number };

const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#a855f7"];

function buildCountData<T extends string>(items: T[]): ChartRow[] {
  const map: Record<string, number> = {};
  items.forEach((x) => (map[x] = (map[x] || 0) + 1));
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function StatusBadge({ status }: { status: string }) {
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

// ─── Active filter pill ───────────────────────────────────────────────────────
function FilterPill({
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
}

export default function ReportsPage() {
  const { getAll: getAllAssets } = useAssetApi();
  const { getAll: getAllMaintenance } = useMaintenanceApi();

  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [maintenance, setMaintenance] = React.useState<Maintenance[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filterSupplier, setFilterSupplier] = React.useState<string>("All");
  const [filterLocation, setFilterLocation] = React.useState<string>("All");
  const [filterAssignedTo, setFilterAssignedTo] = React.useState<string>("All");
  const [filterDateFrom, setFilterDateFrom] = React.useState("");
  const [filterDateTo, setFilterDateTo] = React.useState("");

  // ── Pagination state for the filtered table ───────────────────────────────
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
  const [tablePage, setTablePage] = React.useState(1);
  const [tablePageSize, setTablePageSize] = React.useState(25);

  // Reset to page 1 whenever filters change
  React.useEffect(() => {
    setTablePage(1);
  }, [
    filterSupplier,
    filterLocation,
    filterAssignedTo,
    filterDateFrom,
    filterDateTo,
  ]);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetList, maintenancePage] = await Promise.all([
        getAllAssets(),
        getAllMaintenance(0, 1000),
      ]);
      setAssets(Array.isArray(assetList) ? assetList : assetList);
      setMaintenance(maintenancePage.content);
    } catch (e) {
      console.error("Failed to load report data:", e);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getAllAssets, getAllMaintenance]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Dropdown options derived from asset list ────────────────────────────────
  const supplierOptions = React.useMemo(() => {
    const names = assets
      .map((a) => a.supplierName)
      .filter((n): n is string => !!n);
    return Array.from(new Set(names)).sort();
  }, [assets]);

  const locationOptions = React.useMemo(() => {
    const names = assets.map((a) => a.location).filter((n): n is string => !!n);
    return Array.from(new Set(names)).sort();
  }, [assets]);

  const assignedToOptions = React.useMemo(() => {
    const names = assets
      .map((a) => a.assignedTo)
      .filter((n): n is string => !!n && n.trim() !== "");
    return Array.from(new Set(names)).sort();
  }, [assets]);

  // ── Chart data ──────────────────────────────────────────────────────────────
  const assetStatusData = buildCountData(assets.map((a) => a.status));
  const assetCategoryData = buildCountData(assets.map((a) => a.category));
  const maintenanceStatusData = buildCountData(
    maintenance.map((m) => m.status),
  );
  const maintenancePriorityData = buildCountData(
    maintenance.map((m) => m.priority),
  );

  // ── Filtered assets ─────────────────────────────────────────────────────────
  const filteredAssets = React.useMemo(() => {
    return assets.filter((a) => {
      const matchSupplier =
        filterSupplier === "All" || a.supplierName === filterSupplier;
      const matchLocation =
        filterLocation === "All" || a.location === filterLocation;
      const matchAssignedTo =
        filterAssignedTo === "All" || a.assignedTo === filterAssignedTo;
      const matchFrom =
        !filterDateFrom ||
        (a.purchaseDate != null && a.purchaseDate >= filterDateFrom);
      const matchTo =
        !filterDateTo ||
        (a.purchaseDate != null && a.purchaseDate <= filterDateTo);
      return (
        matchSupplier &&
        matchLocation &&
        matchAssignedTo &&
        matchFrom &&
        matchTo
      );
    });
  }, [
    assets,
    filterSupplier,
    filterLocation,
    filterAssignedTo,
    filterDateFrom,
    filterDateTo,
  ]);

  // Slice of filteredAssets for the current page
  const tableTotalPages = Math.max(
    Math.ceil(filteredAssets.length / tablePageSize),
    1,
  );
  const paginatedAssets = React.useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return filteredAssets.slice(start, start + tablePageSize);
  }, [filteredAssets, tablePage, tablePageSize]);

  const tableFrom =
    filteredAssets.length === 0 ? 0 : (tablePage - 1) * tablePageSize + 1;
  const tableTo = Math.min(tablePage * tablePageSize, filteredAssets.length);

  const activeFilters: { label: string; onRemove: () => void }[] = [
    ...(filterSupplier !== "All"
      ? [
          {
            label: `Supplier: ${filterSupplier}`,
            onRemove: () => setFilterSupplier("All"),
          },
        ]
      : []),
    ...(filterLocation !== "All"
      ? [
          {
            label: `Location: ${filterLocation}`,
            onRemove: () => setFilterLocation("All"),
          },
        ]
      : []),
    ...(filterAssignedTo !== "All"
      ? [
          {
            label: `Assigned To: ${filterAssignedTo}`,
            onRemove: () => setFilterAssignedTo("All"),
          },
        ]
      : []),
    ...(filterDateFrom
      ? [
          {
            label: `From: ${filterDateFrom}`,
            onRemove: () => setFilterDateFrom(""),
          },
        ]
      : []),
    ...(filterDateTo
      ? [{ label: `To: ${filterDateTo}`, onRemove: () => setFilterDateTo("") }]
      : []),
  ];

  const hasActiveFilters = activeFilters.length > 0;

  const clearFilters = () => {
    setFilterSupplier("All");
    setFilterLocation("All");
    setFilterAssignedTo("All");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const handleDownloadFiltered = () => {
    generateFilteredAssetReport(filteredAssets, {
      supplierName: filterSupplier !== "All" ? filterSupplier : undefined,
      location: filterLocation !== "All" ? filterLocation : undefined,
      assignedTo: filterAssignedTo !== "All" ? filterAssignedTo : undefined,
      purchaseDateFrom: filterDateFrom || undefined,
      purchaseDateTo: filterDateTo || undefined,
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Summary statistics and downloadable PDF reports.
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
            onClick={() => generateAssetReport(assets)}
            className="gap-2"
            type="button"
            disabled={loading || assets.length === 0}
          >
            <Download className="h-4 w-4" />
            Assets PDF
          </Button>
          <Button
            onClick={() => generateAssetReportExcel(assets)}
            variant="outline"
            className="gap-2"
            type="button"
            disabled={loading || assets.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Assets Excel
          </Button>
          <Button
            onClick={() => generateMaintenanceReport(maintenance)}
            variant="secondary"
            className="gap-2"
            type="button"
            disabled={loading || maintenance.length === 0}
          >
            <FileText className="h-4 w-4" />
            Maintenance PDF
          </Button>
          <Button
            onClick={() => generateMaintenanceReportExcel(maintenance)}
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

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-16">
                <div className="h-6 w-32 animate-pulse rounded bg-muted mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Charts Row 1 */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Asset Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                {assetStatusData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No data available
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assets by Category</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                {assetCategoryData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assetCategoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        fill="#3b82f6"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance by Status</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                {maintenanceStatusData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={maintenanceStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        fill="#22c55e"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance by Priority</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                {maintenancePriorityData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No data available
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Filtered Asset Report ─────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">
                    Filtered Asset Report
                  </CardTitle>
                  {hasActiveFilters && (
                    <span className="text-xs text-muted-foreground">
                      — {filteredAssets.length} result
                      {filteredAssets.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
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
                    onClick={handleDownloadFiltered}
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
                    onClick={() =>
                      generateFilteredAssetReportExcel(filteredAssets, {
                        supplierName:
                          filterSupplier !== "All" ? filterSupplier : undefined,
                        location:
                          filterLocation !== "All" ? filterLocation : undefined,
                        assignedTo:
                          filterAssignedTo !== "All"
                            ? filterAssignedTo
                            : undefined,
                        purchaseDateFrom: filterDateFrom || undefined,
                        purchaseDateTo: filterDateTo || undefined,
                      })
                    }
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
              {/* Filter controls — 5 columns on large screens */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {/* Supplier */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Supplier</div>
                  <Select
                    value={filterSupplier}
                    onValueChange={setFilterSupplier}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Suppliers</SelectItem>
                      {supplierOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Location</div>
                  <Select
                    value={filterLocation}
                    onValueChange={setFilterLocation}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Locations</SelectItem>
                      {locationOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assigned To */}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Assigned To
                  </div>
                  <Select
                    value={filterAssignedTo}
                    onValueChange={setFilterAssignedTo}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Employees</SelectItem>
                      {assignedToOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Purchase Date From */}
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

                {/* Purchase Date To */}
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Code</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Purchase Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssets.length === 0 ? (
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
                            {a.supplierName ?? "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {a.purchaseDate ?? "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* ── Pagination controls ── */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    {filteredAssets.length === 0
                      ? "No results"
                      : `Showing ${tableFrom}–${tableTo} of ${filteredAssets.length}`}
                  </p>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Rows per page
                      </span>
                      <Select
                        value={String(tablePageSize)}
                        onValueChange={(v) => {
                          setTablePageSize(Number(v));
                          setTablePage(1);
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
                        onClick={() => setTablePage(1)}
                        disabled={tablePage === 1}
                        title="First page"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        type="button"
                        onClick={() => setTablePage((p) => p - 1)}
                        disabled={tablePage === 1}
                        title="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[90px] text-center text-sm text-muted-foreground">
                        Page {tablePage} of {tableTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        type="button"
                        onClick={() => setTablePage((p) => p + 1)}
                        disabled={tablePage >= tableTotalPages}
                        title="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        type="button"
                        onClick={() => setTablePage(tableTotalPages)}
                        disabled={tablePage >= tableTotalPages}
                        title="Last page"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
