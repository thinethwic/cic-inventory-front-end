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
import { Download, FileText, RefreshCw, Filter } from "lucide-react";

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

export default function ReportsPage() {
  const { getAll: getAllAssets } = useAssetApi();
  const { getAll: getAllMaintenance } = useMaintenanceApi();

  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [maintenance, setMaintenance] = React.useState<Maintenance[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ── Filtered report state ───────────────────────────────────────────────────
  const [filterSupplier, setFilterSupplier] = React.useState<string>("All");
  const [filterDateFrom, setFilterDateFrom] = React.useState("");
  const [filterDateTo, setFilterDateTo] = React.useState("");

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

  // ── Unique suppliers derived from asset list ────────────────────────────────
  const supplierOptions = React.useMemo(() => {
    const names = assets
      .map((a) => a.supplierName)
      .filter((n): n is string => !!n);
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
      const matchFrom =
        !filterDateFrom ||
        (a.purchaseDate != null && a.purchaseDate >= filterDateFrom);
      const matchTo =
        !filterDateTo ||
        (a.purchaseDate != null && a.purchaseDate <= filterDateTo);
      return matchSupplier && matchFrom && matchTo;
    });
  }, [assets, filterSupplier, filterDateFrom, filterDateTo]);

  const hasActiveFilters =
    filterSupplier !== "All" || !!filterDateFrom || !!filterDateTo;

  const handleDownloadFiltered = () => {
    generateFilteredAssetReport(filteredAssets, {
      supplierName: filterSupplier !== "All" ? filterSupplier : undefined,
      purchaseDateFrom: filterDateFrom || undefined,
      purchaseDateTo: filterDateTo || undefined,
    });
  };

  const clearFilters = () => {
    setFilterSupplier("All");
    setFilterDateFrom("");
    setFilterDateTo("");
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
            onClick={() => generateMaintenanceReport(maintenance)}
            variant="secondary"
            className="gap-2"
            type="button"
            disabled={loading || maintenance.length === 0}
          >
            <FileText className="h-4 w-4" />
            Maintenance PDF
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
                      Clear filters
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
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
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

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Code</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Purchase Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssets.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No assets match the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAssets.slice(0, 50).map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">
                            {a.assetCode}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {a.category}
                          </TableCell>
                          <TableCell>
                            {a.brand} {a.model}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={a.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {a.location}
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
                {filteredAssets.length > 50 && (
                  <div className="border-t px-4 py-2 text-xs text-muted-foreground">
                    Showing first 50 of {filteredAssets.length} results. PDF
                    download includes all {filteredAssets.length} records.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
