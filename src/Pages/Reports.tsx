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
import { Download, FileText, RefreshCw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import type { Asset, Maintenance } from "@/types";
import { useAssetApi } from "@/lib/api";
import { useMaintenanceApi } from "@/lib/maintainance-api";
import {
  generateAssetReport,
  generateMaintenanceReport,
} from "@/utils/pdfReports";

type ChartRow = { name: string; value: number };

const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#a855f7"];

function buildCountData<T extends string>(items: T[]): ChartRow[] {
  const map: Record<string, number> = {};
  items.forEach((x) => (map[x] = (map[x] || 0) + 1));
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

export default function ReportsPage() {
  const { getAll: getAllAssets } = useAssetApi();
  const { getAll: getAllMaintenance } = useMaintenanceApi();

  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [maintenance, setMaintenance] = React.useState<Maintenance[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ── Fetch both on mount ─────────────────────────────────────────────────────
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

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalAssets = assets.length;
  const availableAssets = assets.filter((a) => a.status === "Available").length;
  const assignedAssets = assets.filter((a) => a.status === "Assigned").length;
  const repairAssets = assets.filter((a) => a.status === "In Repair").length;
  const disposedAssets = assets.filter((a) => a.status === "Disposed").length;

  const totalMaintenance = maintenance.length;
  const openMaintenance = maintenance.filter(
    (m) => m.status !== "Completed" && m.status !== "Cancelled",
  ).length;
  const totalMaintenanceCost = maintenance.reduce(
    (sum, m) => sum + (typeof m.cost === "number" ? m.cost : 0),
    0,
  );

  // ── Chart data ──────────────────────────────────────────────────────────────
  const assetStatusData = buildCountData(assets.map((a) => a.status));
  const assetCategoryData = buildCountData(assets.map((a) => a.category));
  const maintenanceStatusData = buildCountData(
    maintenance.map((m) => m.status),
  );
  const maintenancePriorityData = buildCountData(
    maintenance.map((m) => m.priority),
  );

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
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-8">
                <div className="h-6 w-16 animate-pulse rounded bg-muted mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Assets</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {totalAssets}
              </CardContent>
              <CardContent className="pt-0 text-xs text-muted-foreground">
                Available: {availableAssets} • Assigned: {assignedAssets}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Assets in Repair</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {repairAssets}
              </CardContent>
              <CardContent className="pt-0 text-xs text-muted-foreground">
                Disposed: {disposedAssets}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Maintenance Tickets</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {totalMaintenance}
              </CardContent>
              <CardContent className="pt-0 text-xs text-muted-foreground">
                Open: {openMaintenance}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Total Maintenance Cost
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {totalMaintenanceCost.toLocaleString()}
              </CardContent>
              <CardContent className="pt-0 text-xs text-muted-foreground">
                (based on entered costs)
              </CardContent>
            </Card>
          </div>

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
        </>
      )}
    </div>
  );
}
