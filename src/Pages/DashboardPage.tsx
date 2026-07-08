// src/Pages/DashboardPage.tsx
import * as React from "react";
import { useAuth, useUser } from "@/lib/auth";
import {
  Laptop,
  Users,
  Wrench,
  ShieldCheck,
  ArrowUpRight,
  Eye,
  QrCode,
  FileDown,
  Repeat,
  Clipboard,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  ShieldAlert,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";

import { fetchDashboardStats, type DashboardStats } from "@/lib/api";
import { fetchAssetTransfers } from "@/lib/asset-transfer-api";
import { useMaintenanceApi } from "@/lib/maintainance-api";
import type { Maintenance } from "@/types";
import type { AssetTransferResponse } from "@/lib/asset-transfer-api";

import { hasRole } from "@/utils/permissions";
import { usePermissions } from "@/hooks/usePermissions";

// ─── Unified Activity type ────────────────────────────────────────────────────
type ActivityStatus = "Success" | "Pending" | "In Progress" | "Cancelled";

type Activity = {
  id: string;
  action: string;
  assetCode: string;
  location: string; // ← ADDED: carries the real location
  detail: string;
  time: string;
  rawDate: Date;
  status: ActivityStatus;
  icon: "transfer" | "maintenance";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(value: string | number | undefined | null): Date {
  if (!value) return new Date(0);
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return date.toLocaleDateString();

  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function transferToActivity(t: AssetTransferResponse): Activity {
  const typeLabel =
    t.TransferType === "employee"
      ? "Employee Transfer"
      : t.TransferType === "location"
        ? "Location Transfer"
        : "Employee + Location Transfer";

  const rawDate = parseDate(t.createdAt);

  return {
    id: `transfer-${t.id}`,
    action: typeLabel,
    assetCode: t.asset.assetCode,
    location: "—",
    detail: t.reason || `${t.asset.brand} ${t.asset.model}`,
    time: formatTime(rawDate),
    rawDate,
    status: "Success",
    icon: "transfer",
  };
}

function maintenanceToActivity(m: Maintenance): Activity {
  const status: ActivityStatus =
    m.status === "Completed"
      ? "Success"
      : m.status === "Cancelled"
        ? "Cancelled"
        : m.status === "In Progress"
          ? "In Progress"
          : "Pending";

  const rawDate = parseDate(m.createdAt ?? m.reportedDate);

  // ← Cast to access location which may not be in the base Maintenance type
  const mExt = m as Maintenance & { location?: string };

  return {
    id: `maintenance-${m.id}`,
    action: "Maintenance Ticket",
    assetCode: m.assetCode,
    location: mExt.location ?? "—", // ← FIXED: use actual maintenance location
    detail: m.issueTitle,
    time: formatTime(rawDate),
    rawDate,
    status,
    icon: "maintenance",
  };
}

function StatusBadge({ status }: { status: ActivityStatus }) {
  if (status === "Success") return <Badge>Success</Badge>;
  if (status === "Pending") return <Badge variant="secondary">Pending</Badge>;
  if (status === "In Progress")
    return <Badge variant="outline">In Progress</Badge>;
  return <Badge variant="destructive">Cancelled</Badge>;
}


// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { getAll: getAllMaintenance } = useMaintenanceApi();

  const { role } = usePermissions();
  const isAdmin = hasRole(role, ["admin", "admin_user"]);

  const [stats, setStats] = React.useState<DashboardStats>({
    total: 0,
    assigned: 0,
    inRepair: 0,
    disposed: 0,
    warrantyExpiring: [],
  });
  const [activity, setActivity] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activityLoading, setActivityLoading] = React.useState(true);

  const [activityPage, setActivityPage] = React.useState(1);
  const [activityPageSize, setActivityPageSize] = React.useState(5);

  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch dashboard stats (server-computed counts, not the full asset list) ─
  React.useEffect(() => {
    let cancelled = false;
    if (!isLoaded) return;

    const load = async () => {
      if (!isSignedIn) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchDashboardStats(getToken);
        if (!cancelled) setStats(data);
      } catch (err) {
        console.error("fetchDashboardStats failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  // ── Fetch activity ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    if (!isLoaded || !isSignedIn) return;

    const loadActivity = async () => {
      setActivityLoading(true);
      try {
        const [transferPage, maintenancePage] = await Promise.all([
          isAdmin
            ? fetchAssetTransfers(getToken, 0, 50)
            : Promise.resolve(null),
          getAllMaintenance(0, 50),
        ]);

        if (cancelled) return;

        const transferActivities = isAdmin
          ? (transferPage?.content ?? []).map(transferToActivity)
          : [];

        const maintenanceActivities = (maintenancePage?.content ?? []).map(
          maintenanceToActivity,
        );

        const merged = [...transferActivities, ...maintenanceActivities].sort(
          (a, b) => b.rawDate.getTime() - a.rawDate.getTime(),
        );

        setActivity(merged);
        setActivityPage(1);
      } catch (err) {
        console.error("Failed to load activity:", err);
        if (!cancelled) setActivity([]);
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    };

    void loadActivity();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, getAllMaintenance, isAdmin]);

  const warrantyExpiring = stats.warrantyExpiring;

  const kpis = [
    { label: "Total Assets", value: stats.total, icon: Laptop },
    { label: "Assigned", value: stats.assigned, icon: Users },
    { label: "In Repair", value: stats.inRepair, icon: Wrench },
    { label: "Disposed", value: stats.disposed, icon: ShieldCheck },
  ];

  const activityTotalPages = Math.max(
    1,
    Math.ceil(activity.length / activityPageSize),
  );

  const paginatedActivity = React.useMemo(() => {
    const start = (activityPage - 1) * activityPageSize;
    return activity
      .slice(start, start + activityPageSize)
      .map((a) => ({ ...a, time: formatTime(a.rawDate) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, activityPage, activityPageSize, now]);

  const activityFrom =
    activity.length === 0 ? 0 : (activityPage - 1) * activityPageSize + 1;
  const activityTo = Math.min(activityPage * activityPageSize, activity.length);

  React.useEffect(() => {
    if (activityPage > activityTotalPages) {
      setActivityPage(activityTotalPages);
    }
  }, [activityPage, activityTotalPages]);

  const handleExportWarrantyReport = React.useCallback(() => {
    if (warrantyExpiring.length === 0) return;

    const rows = warrantyExpiring.map((item) => ({
      assetCode: item.assetCode,
      model: item.model,
      daysRemaining: item.days,
    }));

    const headers = ["Asset Code", "Model", "Days Remaining"];
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        [
          `"${row.assetCode}"`,
          `"${row.model.replace(/"/g, '""')}"`,
          row.daysRemaining,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `warranty-expiring-report-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [warrantyExpiring]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome{user?.firstName ? `, ${user.firstName}` : ""} — monitor IT
          assets and activity.
        </p>
      </div>

      {/* ── KPI Cards ── */}
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
                  <Skeleton className="h-8 w-14" />
                ) : (
                  <div className="text-2xl font-bold">{k.value}</div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {loading ? "Loading…" : "Live from server"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Quick Actions ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild className="gap-2" type="button">
            <Link to="/assets">
              {isAdmin ? (
                <>
                  <ArrowUpRight className="h-4 w-4" /> Assign Asset
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" /> View Assets
                </>
              )}
            </Link>
          </Button>

          <Button asChild variant="secondary" className="gap-2" type="button">
            <Link to="/maintenance">
              <Wrench className="h-4 w-4" /> Add Maintenance
            </Link>
          </Button>

          {isAdmin && (
            <Button asChild variant="outline" className="gap-2" type="button">
              <Link to="/assetTransfer">
                <Repeat className="h-4 w-4" /> Transfer Asset
              </Link>
            </Button>
          )}

          {isAdmin && (
            <Button variant="outline" className="gap-2" type="button">
              <QrCode className="h-4 w-4" />{" "}
              <Link to="/assets">Print QR Labels</Link>
            </Button>
          )}

          {isAdmin && (
            <Button asChild variant="outline" className="gap-2" type="button">
              <Link to="/reports">
                <FileDown className="h-4 w-4" /> Export Report
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Activity + Warranty ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Recent Activity
              {!isAdmin && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (Maintenance only)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-14" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-5 w-16 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Inbox className="h-5 w-5 text-muted-foreground" />
                </div>
                No recent activity found.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedActivity.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {a.icon === "transfer" ? (
                              <Repeat className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Clipboard className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">
                              {a.action}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {a.assetCode}
                        </TableCell>
                        {/* ← FIXED: render a.location instead of hardcoded "location" */}
                        <TableCell className="text-xs text-muted-foreground">
                          {a.location}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {a.detail}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.time}
                        </TableCell>
                        <TableCell className="text-right">
                          <StatusBadge status={a.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {activityFrom}–{activityTo} of {activity.length}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Rows per page
                      </span>
                      <Select
                        value={String(activityPageSize)}
                        onValueChange={(value) => {
                          setActivityPageSize(Number(value));
                          setActivityPage(1);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[80px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        type="button"
                        disabled={activityPage === 1}
                        onClick={() =>
                          setActivityPage((prev) => Math.max(prev - 1, 1))
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <span className="min-w-[90px] text-center text-sm text-muted-foreground">
                        Page {activityPage} of {activityTotalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="icon-sm"
                        type="button"
                        disabled={activityPage === activityTotalPages}
                        onClick={() =>
                          setActivityPage((prev) =>
                            Math.min(prev + 1, activityTotalPages),
                          )
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator className="my-4" />
            <div className="flex justify-end gap-2">
              {isAdmin && (
                <Button asChild variant="ghost" className="gap-2" type="button">
                  <Link to="/assetTransfer">
                    View transfers <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost" className="gap-2" type="button">
                <Link to="/maintenance">
                  View tickets <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Warranty Expiring ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Warranty Expiring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : warrantyExpiring.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                </div>
                No warranties expiring in the next 60 days.
              </div>
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
            <Button
              variant="outline"
              className="w-full gap-2"
              type="button"
              onClick={handleExportWarrantyReport}
              disabled={loading || warrantyExpiring.length === 0}
            >
              <Download className="h-4 w-4" />
              Export Warranty Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
