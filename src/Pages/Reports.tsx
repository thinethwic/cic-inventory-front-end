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
import { Download, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import type { Asset, Maintenance } from "@/types";

import { seedAssets, seedMaintenance } from "@/assets.seed";

import {
  generateAssetReport,
  generateMaintenanceReport,
} from "@/utils/pdfReports";

type ChartRow = { name: string; value: number };

const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#a855f7"];

// Generic so AssetStatus, AssetCategory, MaintenanceStatus etc. all work
function buildCountData<T extends string>(items: T[]): ChartRow[] {
  const map: Record<string, number> = {};
  items.forEach((x) => (map[x] = (map[x] || 0) + 1));
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

export default function ReportsPage() {
  const assets: Asset[] = seedAssets;
  const maintenance: Maintenance[] = seedMaintenance;

  // ── KPI ───────────────────────────────────────────────────────────────────
  const totalAssets = assets.length;
  const availableAssets = assets.filter((a) => a.status === "Available").length;
  const assignedAssets = assets.filter((a) => a.status === "Assigned").length;
  const repairAssets = assets.filter((a) => a.status === "In Repair").length;
  const disposedAssets = assets.filter((a) => a.status === "Disposed").length;

  const openMaintenance = maintenance.filter(
    (m) => m.status !== "Completed" && m.status !== "Cancelled",
  ).length;

  const totalMaintenance = maintenance.length;

  const totalMaintenanceCost = maintenance.reduce(
    (sum, m) => sum + (typeof m.cost === "number" ? m.cost : 0),
    0,
  );

  // ── Charts — no useMemo, React Compiler handles memoization automatically ─
  const assetStatusData = buildCountData(assets.map((a) => a.status));
  const assetCategoryData = buildCountData(assets.map((a) => a.category));
  const maintenanceStatusData = buildCountData(
    maintenance.map((m) => m.status),
  );
  const maintenancePriorityData = buildCountData(
    maintenance.map((m) => m.priority),
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
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
            onClick={() => generateAssetReport(assets)}
            className="gap-2"
            type="button"
          >
            <Download className="h-4 w-4" />
            Assets PDF
          </Button>

          <Button
            onClick={() => generateMaintenanceReport(maintenance)}
            variant="secondary"
            className="gap-2"
            type="button"
          >
            <FileText className="h-4 w-4" />
            Maintenance PDF
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
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
            <CardTitle className="text-sm">Total Maintenance Cost</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {totalMaintenanceCost.toLocaleString()}
          </CardContent>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            (based on entered costs)
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assets by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Maintenance by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintenanceStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance by Priority</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
