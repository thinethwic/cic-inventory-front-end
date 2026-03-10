// src/Pages/AssetTransferPage.tsx
import * as React from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Repeat,
  Search,
  Package,
  MapPin,
  User,
  FileText,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useManagementApi } from "@/lib/management-api";
import { fetchAssets, updateAsset } from "@/lib/api";
import {
  fetchAssetTransfers,
  createAssetTransfer,
  type AssetTransferResponse,
  type AssetTransferDTO,
} from "@/lib/asset-transfer-api";
import type { Asset, AssetFormState, Employee, Location } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type TransferType = "employee" | "location" | "both";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEmployeeLabel(employee: Employee) {
  if (employee.empId && employee.name)
    return `${employee.empId} - ${employee.name}`;
  return employee.name || employee.empId || `Employee #${employee.id}`;
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "Available":
      return "secondary";
    case "Assigned":
      return "default";
    case "In Repair":
      return "outline";
    case "Disposed":
    case "Retired":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Builds the payload for updateAsset (PUT /api/assets/{id}).
 * The transfer record itself only needs assetId, transferType, transferDate, reason.
 */
function buildAssetPayload(args: {
  asset: Asset;
  transferType: TransferType;
  newEmployeeId: string;
  newLocationId: string;
}): AssetFormState {
  const { asset, transferType, newEmployeeId, newLocationId } = args;

  const nextEmployeeId =
    transferType === "employee" || transferType === "both"
      ? newEmployeeId
      : asset.assignedToId || "";

  const nextLocationId =
    transferType === "location" || transferType === "both"
      ? newLocationId
      : asset.locationId || "";

  return {
    assetCode: asset.assetCode,
    barcode: asset.barcode ?? "",
    category: asset.category,
    brand: asset.brand,
    model: asset.model,
    serialNo: asset.serialNo,
    status: nextEmployeeId ? "Assigned" : asset.status,
    locationId: nextLocationId,
    assignedToId: nextEmployeeId,
    purchaseDate: asset.purchaseDate ?? "",
    warrantyEnd: asset.warrantyEnd ?? "",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AssetTransferPage() {
  const { getToken } = useAuth();
  const managementApi = useManagementApi();

  // Stable refs — prevent stale closures in useCallback
  const getTokenRef = React.useRef(getToken);
  getTokenRef.current = getToken;
  const loadAssetLookupsRef = React.useRef(managementApi.loadAssetLookups);
  loadAssetLookupsRef.current = managementApi.loadAssetLookups;

  // ── State ─────────────────────────────────────────────────────────────────
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [history, setHistory] = React.useState<AssetTransferResponse[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  // Form fields
  const [search, setSearch] = React.useState("");
  const [selectedAssetId, setSelectedAssetId] = React.useState("");
  const [transferType, setTransferType] = React.useState<TransferType>("both");
  const [newEmployeeId, setNewEmployeeId] = React.useState("");
  const [newLocationId, setNewLocationId] = React.useState("");
  const [transferDate, setTransferDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = React.useState("");

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadPageData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [assetRows, lookups] = await Promise.all([
        fetchAssets(getTokenRef.current),
        loadAssetLookupsRef.current(),
      ]);
      setAssets(assetRows);
      setEmployees(lookups.employees);
      setLocations(lookups.locations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    try {
      const page = await fetchAssetTransfers(getTokenRef.current, 0, 50);
      setHistory(page.content);
    } catch (err) {
      console.warn("Failed to load transfer history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadPageData();
    void loadHistory();
  }, [loadPageData, loadHistory]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const filteredAssets = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) =>
      [
        a.assetCode,
        a.serialNo,
        a.barcode,
        a.brand,
        a.model,
        a.category,
        a.location,
        a.assignedTo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [assets, search]);

  const selectedAsset = React.useMemo(
    () => assets.find((a) => a.id === selectedAssetId) ?? null,
    [assets, selectedAssetId],
  );

  // Reset form when asset changes
  React.useEffect(() => {
    setSuccess("");
    setError("");
    setNewEmployeeId("");
    setNewLocationId("");
  }, [selectedAssetId]);

  // ── Transfer handler ──────────────────────────────────────────────────────
  async function handleTransfer() {
    if (!selectedAsset) {
      setError("Please select an asset.");
      return;
    }

    if (
      (transferType === "employee" || transferType === "both") &&
      !newEmployeeId
    ) {
      setError("Please select a new employee.");
      return;
    }
    if (
      (transferType === "location" || transferType === "both") &&
      !newLocationId
    ) {
      setError("Please select a new location.");
      return;
    }
    if (
      (transferType === "employee" || transferType === "both") &&
      selectedAsset.assignedToId === newEmployeeId
    ) {
      setError("Asset is already assigned to this employee.");
      return;
    }
    if (
      (transferType === "location" || transferType === "both") &&
      selectedAsset.locationId === newLocationId
    ) {
      setError("Asset is already at this location.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // ── Step 1: Update the asset's employee / location assignment ──────────
      const assetPayload = buildAssetPayload({
        asset: selectedAsset,
        transferType,
        newEmployeeId,
        newLocationId,
      });
      const updatedAsset = await updateAsset(
        getToken,
        selectedAsset.id,
        assetPayload,
      );

      // ── Step 2: Persist the transfer record in the backend ─────────────────
      //   Only the fields the entity actually has:
      //   assetId, transferType, transferDate, reason
      const dto: AssetTransferDTO = {
        assetId: { id: Number(selectedAsset.id) },
        transferType, // "employee" | "location" | "both"
        transferDate, // "YYYY-MM-DD"
        reason: reason.trim() || undefined,
      };
      const savedTransfer = await createAssetTransfer(getToken, dto);

      // ── Step 3: Sync local state ───────────────────────────────────────────
      setAssets((prev) =>
        prev.map((item) => (item.id === updatedAsset.id ? updatedAsset : item)),
      );
      setSelectedAssetId(updatedAsset.id);
      setHistory((prev) => [savedTransfer, ...prev]); // prepend latest

      // ── Step 4: Reset form ─────────────────────────────────────────────────
      setTransferType("both");
      setNewEmployeeId("");
      setNewLocationId("");
      setTransferDate(new Date().toISOString().slice(0, 10));
      setReason("");
      setSuccess(
        `Transfer complete — ${updatedAsset.assetCode} is now assigned to ` +
          `${updatedAsset.assignedTo || "nobody"} at ${updatedAsset.location || "no location"}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asset Transfer</h1>
          <p className="text-sm text-muted-foreground">
            Transfer assets between employees and locations.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit gap-2 px-3 py-1.5">
          <Repeat className="h-4 w-4" />
          Transfer Management
        </Badge>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Transfer Successful</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex min-h-[320px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading asset transfer data...
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-3">
            {/* ── Transfer Form ── */}
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Create Transfer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div className="space-y-2">
                  <Label htmlFor="search-asset">Search Asset</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="search-asset"
                      placeholder="Search by asset code, serial no, barcode, brand, model..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Asset selector */}
                <div className="space-y-2">
                  <Label>Select Asset</Label>
                  <Select
                    value={selectedAssetId}
                    onValueChange={setSelectedAssetId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAssets.length > 0 ? (
                        filteredAssets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.assetCode} — {asset.brand} {asset.model}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No assets found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Transfer type + date */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Transfer Type</Label>
                    <Select
                      value={transferType}
                      onValueChange={(v) => setTransferType(v as TransferType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transfer type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">
                          Employee Transfer
                        </SelectItem>
                        <SelectItem value="location">
                          Location Transfer
                        </SelectItem>
                        <SelectItem value="both">
                          Employee + Location
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Transfer Date</Label>
                    <Input
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* New employee */}
                {(transferType === "employee" || transferType === "both") && (
                  <div className="space-y-2">
                    <Label>New Employee</Label>
                    <Select
                      value={newEmployeeId}
                      onValueChange={setNewEmployeeId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select new employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No employees available
                          </div>
                        ) : (
                          employees.map((emp) => (
                            <SelectItem key={emp.id} value={String(emp.id)}>
                              {getEmployeeLabel(emp)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* New location */}
                {(transferType === "location" || transferType === "both") && (
                  <div className="space-y-2">
                    <Label>New Location</Label>
                    <Select
                      value={newLocationId}
                      onValueChange={setNewLocationId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select new location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No locations available
                          </div>
                        ) : (
                          locations.map((loc) => (
                            <SelectItem key={loc.id} value={String(loc.id)}>
                              {loc.name} ({loc.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Reason */}
                <div className="space-y-2">
                  <Label>Reason / Notes</Label>
                  <Textarea
                    rows={4}
                    placeholder="Enter transfer reason..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void loadPageData();
                      void loadHistory();
                    }}
                    disabled={loading || submitting}
                  >
                    Refresh Data
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleTransfer()}
                    disabled={submitting}
                    className="gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Repeat className="h-4 w-4" />
                    )}
                    Confirm Transfer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ── Asset Details Panel ── */}
            <Card>
              <CardHeader>
                <CardTitle>Selected Asset Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedAsset ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {selectedAsset.assetCode}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedAsset.brand} {selectedAsset.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedAsset.category}
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Current Employee</p>
                          <p className="text-muted-foreground">
                            {selectedAsset.assignedTo || "Not assigned"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Current Location</p>
                          <p className="text-muted-foreground">
                            {selectedAsset.location || "No location"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Package className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Status</p>
                          <Badge
                            variant={getStatusBadgeVariant(
                              selectedAsset.status,
                            )}
                          >
                            {selectedAsset.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Serial Number</p>
                          <p className="text-muted-foreground">
                            {selectedAsset.serialNo || "-"}
                          </p>
                        </div>
                      </div>
                      {selectedAsset.barcode && (
                        <div className="flex items-start gap-2">
                          <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Barcode</p>
                            <p className="text-muted-foreground">
                              {selectedAsset.barcode}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                    Select an asset to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Transfer History ── */}
          <Card>
            <CardHeader>
              <CardTitle>Transfer History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex min-h-[100px] items-center justify-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading history...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset Code</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Transfer Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Recorded At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.length > 0 ? (
                        history.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.asset.assetCode}
                            </TableCell>
                            <TableCell>
                              {item.asset.brand} {item.asset.model}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {item.transferType}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.transferDate}</TableCell>
                            <TableCell>{item.reason || "-"}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {new Date(item.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No transfer history yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
