import * as React from "react";
import { FileText, MoreHorizontal, Eye } from "lucide-react";

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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type {
  AuditLog,
  AuditAction,
  AuditEntity,
  AuditSeverity,
} from "@/types";
import {
  auditActionOptions,
  auditEntityOptions,
  auditSeverityOptions,
} from "@/types";

import { seedAuditLogs } from "@/assets.seed";
import { generateAuditLogReport } from "@/utils/auditPdf";

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  const variant =
    severity === "CRITICAL"
      ? "destructive"
      : severity === "HIGH"
        ? "default"
        : severity === "MEDIUM"
          ? "secondary"
          : "outline";

  return <Badge variant={variant}>{severity}</Badge>;
}

export default function AuditLogsPage() {
  const [logs] = React.useState<AuditLog[]>(seedAuditLogs);

  const [q, setQ] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState<AuditAction | "All">(
    "All",
  );
  const [entityFilter, setEntityFilter] = React.useState<AuditEntity | "All">(
    "All",
  );
  const [severityFilter, setSeverityFilter] = React.useState<
    AuditSeverity | "All"
  >("All");

  const [openView, setOpenView] = React.useState(false);
  const [viewRow, setViewRow] = React.useState<AuditLog | null>(null);

  const filtered = React.useMemo(() => {
    const text = q.trim().toLowerCase();

    return logs
      .slice()
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .filter((l) => {
        const matchText =
          !text ||
          `${l.actorName} ${l.actorEmail ?? ""} ${l.action} ${l.entity} ${
            l.entityLabel ?? ""
          } ${l.summary} ${l.ip ?? ""}`
            .toLowerCase()
            .includes(text);

        const matchAction =
          actionFilter === "All" ? true : l.action === actionFilter;
        const matchEntity =
          entityFilter === "All" ? true : l.entity === entityFilter;
        const matchSeverity =
          severityFilter === "All" ? true : l.severity === severityFilter;

        return matchText && matchAction && matchEntity && matchSeverity;
      });
  }, [logs, q, actionFilter, entityFilter, severityFilter]);

  const openDetails = (row: AuditLog) => {
    setViewRow(row);
    setOpenView(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Track system actions for security, compliance, and troubleshooting.
          </p>
        </div>

        <Button
          onClick={() => generateAuditLogReport(filtered)}
          className="gap-2"
          type="button"
          variant="secondary"
        >
          <FileText className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <div className="text-xs text-muted-foreground">Search</div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="user, action, entity, item, ip..."
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Action</div>
            <Select
              value={actionFilter}
              onValueChange={(v) => setActionFilter(v as AuditAction | "All")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {auditActionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Entity</div>
            <Select
              value={entityFilter}
              onValueChange={(v) => setEntityFilter(v as AuditEntity | "All")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {auditEntityOptions.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Severity</div>
            <Select
              value={severityFilter}
              onValueChange={(v) =>
                setSeverityFilter(v as AuditSeverity | "All")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {auditSeverityOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
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
            Logs{" "}
            <span className="text-muted-foreground">({filtered.length})</span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No audit logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(l.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{l.actorName}</div>
                        <div className="text-xs text-muted-foreground">
                          {l.actorEmail ?? ""}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{l.action}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {l.entity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {l.entityLabel ?? "-"}
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={l.severity} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {l.ip ?? "-"}
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
                            <DropdownMenuItem onClick={() => openDetails(l)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
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

      {/* View Details Dialog */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>

          {viewRow ? (
            <div className="space-y-3 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">Time</div>
                  <div className="font-medium">
                    {new Date(viewRow.timestamp).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">User</div>
                  <div className="font-medium">{viewRow.actorName}</div>
                  <div className="text-xs text-muted-foreground">
                    {viewRow.actorEmail ?? ""}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Action</div>
                  <div className="font-medium">{viewRow.action}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Entity</div>
                  <div className="font-medium">{viewRow.entity}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Item</div>
                  <div className="font-medium">
                    {viewRow.entityLabel ?? "-"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {viewRow.entityId ?? ""}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Severity</div>
                  <SeverityBadge severity={viewRow.severity} />
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">IP</div>
                  <div className="font-medium">{viewRow.ip ?? "-"}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">
                    User Agent
                  </div>
                  <div className="font-medium">{viewRow.userAgent ?? "-"}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Summary</div>
                <div className="font-medium">{viewRow.summary}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Details (JSON)
                </div>
                <pre className="rounded-md border bg-muted/30 p-3 text-xs overflow-auto">
                  {JSON.stringify(viewRow.details ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
