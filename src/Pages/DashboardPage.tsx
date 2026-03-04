// src/Pages/DashboardPage.tsx
import * as React from "react";
import { useUser } from "@clerk/clerk-react";
import {
  Laptop,
  Users,
  Wrench,
  ShieldCheck,
  ArrowUpRight,
  QrCode,
  FileDown,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "react-router-dom";
import { fetchAssets } from "@/lib/api";
import type { Asset } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────
type Activity = {
  id: string;
  action: string;
  assetCode: string;
  by: string;
  time: string;
  status: "Success" | "Pending" | "Failed";
};

// ─── Static data (unchanged) ──────────────────────────────────────────────────
const recentActivity: Activity[] = [
  {
    id: "1",
    action: "Assigned asset",
    assetCode: "CIC-IT-LAP-0021",
    by: "IT Admin",
    time: "Today 09:20",
    status: "Success",
  },
  {
    id: "2",
    action: "Maintenance started",
    assetCode: "CIC-IT-PRN-0007",
    by: "Technician",
    time: "Yesterday 16:10",
    status: "Pending",
  },
  {
    id: "3",
    action: "Transferred asset",
    assetCode: "CIC-IT-LAP-0014",
    by: "IT Admin",
    time: "Yesterday 11:05",
    status: "Success",
  },
];

function statusBadge(status: Activity["status"]) {
  if (status === "Success") return <Badge>Success</Badge>;
  if (status === "Pending") return <Badge variant="secondary">Pending</Badge>;
  return <Badge variant="destructive">Failed</Badge>;
}

// ─── KPI stat derived from assets ────────────────────────────────────────────
interface KpiStats {
  total: number;
  assigned: number;
  inRepair: number;
  disposed: number;
}

function computeStats(assets: Asset[]): KpiStats {
  return {
    total: assets.length,
    assigned: assets.filter((a) => a.status === "Assigned").length,
    inRepair: assets.filter((a) => a.status === "In Repair").length,
    disposed: assets.filter((a) => a.status === "Disposed").length,
  };
}

// ─── Warranty expiring: assets whose warrantyEnd is within 60 days ────────────
function getWarrantyExpiring(assets: Asset[]) {
  const today = new Date();
  return assets
    .filter((a) => {
      if (!a.warrantyEnd) return false;
      const end = new Date(a.warrantyEnd);
      const diffDays = Math.ceil(
        (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      return diffDays > 0 && diffDays <= 60;
    })
    .map((a) => ({
      assetCode: a.assetCode,
      model: `${a.brand} ${a.model}`.trim(),
      days: Math.ceil(
        (new Date(a.warrantyEnd!).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useUser();

  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchAssets();
        setAssets(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = React.useMemo(() => computeStats(assets), [assets]);
  const warrantyExpiring = React.useMemo(
    () => getWarrantyExpiring(assets),
    [assets],
  );

  const kpis = [
    { label: "Total Assets", value: stats.total, icon: Laptop },
    { label: "Assigned", value: stats.assigned, icon: Users },
    { label: "In Repair", value: stats.inRepair, icon: Wrench },
    { label: "Disposed", value: stats.disposed, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome{user?.firstName ? `, ${user.firstName}` : ""} — monitor IT
          assets and activity.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {k.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">{k.value}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {loading ? "Loading…" : "Live from server"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button className="gap-2" type="button">
            <ArrowUpRight className="h-4 w-4" />
            <Link to="/assets">Assign Asset</Link>
          </Button>
          <Button variant="secondary" className="gap-2" type="button">
            <Wrench className="h-4 w-4" />
            <Link to="/maintenance">Add Maintenance</Link>
          </Button>
          <Button variant="outline" className="gap-2" type="button">
            <QrCode className="h-4 w-4" />
            Print QR Labels
          </Button>
          <Button variant="outline" className="gap-2" type="button">
            <FileDown className="h-4 w-4" />
            Export Report
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.action}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.assetCode}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.by}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.time}
                    </TableCell>
                    <TableCell className="text-right">
                      {statusBadge(a.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator className="my-4" />
            <div className="flex justify-end">
              <Button variant="ghost" className="gap-2" type="button">
                View all logs <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Warranty Expiring */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Warranty Expiring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : warrantyExpiring.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No warranties expiring in the next 60 days.
              </p>
            ) : (
              warrantyExpiring.map((w) => (
                <div key={w.assetCode} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{w.assetCode}</div>
                      <div className="text-xs text-muted-foreground">
                        {w.model}
                      </div>
                    </div>
                    <Badge variant={w.days <= 14 ? "destructive" : "secondary"}>
                      {w.days}d
                    </Badge>
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" className="w-full" type="button">
              View Warranty Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
