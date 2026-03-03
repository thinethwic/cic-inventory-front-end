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

type Activity = {
  id: string;
  action: string;
  assetCode: string;
  by: string;
  time: string;
  status: "Success" | "Pending" | "Failed";
};

const kpis = [
  { label: "Total Assets", value: 128, icon: Laptop },
  { label: "Assigned", value: 92, icon: Users },
  { label: "In Repair", value: 7, icon: Wrench },
  { label: "Audit Logs", value: 342, icon: ShieldCheck },
];

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

const warrantyExpiring = [
  { assetCode: "CIC-IT-LAP-0009", model: "Dell Latitude 5420", days: 12 },
  { assetCode: "CIC-IT-NET-0012", model: "MikroTik hAP ac2", days: 18 },
  { assetCode: "CIC-IT-PRN-0003", model: "HP M404dn", days: 25 },
];

function statusBadge(status: Activity["status"]) {
  if (status === "Success") return <Badge>Success</Badge>;
  if (status === "Pending") return <Badge variant="secondary">Pending</Badge>;
  return <Badge variant="destructive">Failed</Badge>;
}

export default function DashboardPage() {
  const { user } = useUser();

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
                <div className="text-2xl font-bold">{k.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated just now
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
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
            Add Maintenance
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
        {/* Recent activity */}
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

        {/* Warranty expiring */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Warranty Expiring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warrantyExpiring.map((w) => (
              <div key={w.assetCode} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{w.assetCode}</div>
                    <div className="text-xs text-muted-foreground">
                      {w.model}
                    </div>
                  </div>
                  <Badge variant={w.days <= 14 ? "destructive" : "secondary"}>
                    {w.days} days
                  </Badge>
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full" type="button">
              View Warranty Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
