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
  Check,
  ChevronsUpDown,
  ChevronsRight,
  ChevronsLeft,
  ChevronRight,
  ChevronLeft,
  Building2,
  Hash,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useManagementApi } from "@/lib/management-api";
import { fetchAssets, useAssetApi } from "@/lib/api";
import {
  fetchAssetTransfers,
  createAssetTransfer,
  type AssetTransferResponse,
  type AssetTransferDTO,
} from "@/lib/asset-transfer-api";
import type { Asset, AssetFormState, Employee, Location } from "@/types";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type TransferType = "employee" | "location" | "both";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "Available":
      return "secondary";
    case "Assigned":
      return "default";
    case "In Repair":
      return "outline";
    case "Damaged":
      return "outline";
    case "Disposed":
    case "Retired":
      return "destructive";
    default:
      return "outline";
  }
}

function getReadableErrorMessage(err: unknown, fallback = "Operation failed.") {
  if (!(err instanceof Error)) return fallback;
  const raw = err.message?.trim() || "";
  const lower = raw.toLowerCase();
  if (
    lower.includes("foreign key") ||
    lower.includes("constraint") ||
    lower.includes("reference") ||
    lower.includes("child record") ||
    lower.includes("linked") ||
    lower.includes("used in another record")
  )
    return "This record is linked to other data, so the operation cannot be completed.";
  if (
    lower.includes("not found") ||
    lower.includes("asset not found") ||
    lower.includes("employee not found") ||
    lower.includes("location not found")
  )
    return raw || "Required data was not found.";
  if (
    lower.includes("conflict") ||
    lower.includes("already exists") ||
    lower.includes("already assigned")
  )
    return raw || "A conflict occurred while processing the request.";
  if (
    lower.includes("bad request") ||
    lower.includes("validation") ||
    lower.includes("invalid")
  )
    return raw || "Invalid data provided.";
  return raw || fallback;
}

// ── Build asset payload ───────────────────────────────────────────────────────
function buildAssetPayload(args: {
  asset: Asset;
  transferType: TransferType;
  newEmployeeId: string;
  newLocationId: string;
  locations: Location[];
}): AssetFormState {
  const { asset, transferType, newEmployeeId, newLocationId, locations } = args;

  // Determine next employee ID
  const nextEmployeeId =
    transferType === "employee" || transferType === "both"
      ? newEmployeeId
      : asset.assignedToId || "";

  // Resolve current location ID from asset (fallback: name lookup)
  const resolveCurrentLocationId = (): string => {
    if (asset.locationId) return asset.locationId;
    if (!asset.location) return "";
    const match = locations.find(
      (l) =>
        l.name?.trim().toLowerCase() === asset.location.trim().toLowerCase(),
    );
    return match ? String(match.id) : "";
  };

  // Determine next location ID
  const nextLocationId =
    transferType === "location" || transferType === "both"
      ? newLocationId
      : resolveCurrentLocationId();

  return {
    assetCode: asset.assetCode,
    barcode: asset.barcode ?? "",
    category: asset.category,
    brand: asset.brand,
    model: asset.model,
    serialNo: asset.serialNo,
    // Mark as Assigned if an employee is being set, otherwise keep current status
    status: nextEmployeeId ? "Assigned" : asset.status,
    locationId: nextLocationId,
    assignedToId: nextEmployeeId,
    purchaseDate: asset.purchaseDate ?? "",
    warrantyEnd: asset.warrantyEnd ?? "",
    supplierId: asset.supplierId != null ? String(asset.supplierId) : "",
  };
}

// ── Parse asset ID safely to number ──────────────────────────────────────────
// Asset.id may be a numeric string ("42") — parse carefully and throw early
// if it is not a valid integer so the error is clear.
function parseAssetId(id: string): number {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Asset ID "${id}" is not a valid number. Cannot create transfer record.`,
    );
  }
  return parsed;
}

// ── Searchable Asset Combobox ─────────────────────────────────────────────────
interface AssetComboboxProps {
  assets: Asset[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

function AssetCombobox({
  assets,
  value,
  onChange,
  disabled,
}: AssetComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
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

  const selected = assets.find((a) => a.id === value);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          type="button"
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-medium text-foreground">
                {selected.assetCode}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="truncate text-muted-foreground">
                {selected.brand} {selected.model}
              </span>
              {selected.serialNo && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {selected.serialNo}
                  </span>
                </>
              )}
            </span>
          ) : (
            "Search and select an asset..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center border-b px-3 py-2 gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, serial, brand, model..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No assets found.
            </div>
          ) : (
            filtered.map((a) => {
              const isSelected = a.id === value;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onChange(a.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                    isSelected && "bg-accent",
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      isSelected ? "opacity-100 text-primary" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {a.assetCode}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="truncate text-muted-foreground">
                        {a.brand} {a.model}
                      </span>
                      <Badge
                        variant={getStatusBadgeVariant(a.status)}
                        className="ml-auto shrink-0 text-xs"
                      >
                        {a.status}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      {a.serialNo && (
                        <span className="font-mono">{a.serialNo}</span>
                      )}
                      {a.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {a.location}
                        </span>
                      )}
                      {a.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {a.assignedTo}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Searchable Employee Combobox ──────────────────────────────────────────────
interface EmployeeComboboxProps {
  employees: Employee[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

function EmployeeCombobox({
  employees,
  value,
  onChange,
  disabled,
}: EmployeeComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [
        e.empId,
        e.name,
        e.email,
        e.phone_no,
        e.department?.name,
        e.location?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [employees, search]);

  const selected = employees.find((e) => String(e.id) === value);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          type="button"
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {selected.empId}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="truncate text-foreground">{selected.name}</span>
              {selected.location?.name && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {selected.location.name}
                  </span>
                </>
              )}
            </span>
          ) : (
            "Search and select an employee..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center border-b px-3 py-2 gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, department, location..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No employees found.
            </div>
          ) : (
            filtered.map((e) => {
              const isSelected = String(e.id) === value;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    onChange(String(e.id));
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                    isSelected && "bg-accent",
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      isSelected ? "opacity-100 text-primary" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {e.empId}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="truncate font-medium text-foreground">
                        {e.name}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {e.location?.name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {e.location.name}
                        </span>
                      )}
                      {e.department?.name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {e.department.name}
                        </span>
                      )}
                      {e.email && <span className="truncate">{e.email}</span>}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Searchable Location Combobox ──────────────────────────────────────────────
interface LocationComboboxProps {
  locations: Location[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

function LocationCombobox({
  locations,
  value,
  onChange,
  disabled,
}: LocationComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((l) =>
      [l.name, l.code].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [locations, search]);

  const selected = locations.find((l) => String(l.id) === value);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          type="button"
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {selected.name}
              </span>
              {selected.code && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    {selected.code}
                  </span>
                </>
              )}
            </span>
          ) : (
            "Search and select a location..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center border-b px-3 py-2 gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No locations found.
            </div>
          ) : (
            filtered.map((l) => {
              const isSelected = String(l.id) === value;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    onChange(String(l.id));
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                    isSelected && "bg-accent",
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      isSelected ? "opacity-100 text-primary" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {l.name}
                      </span>
                    </div>
                    {l.code && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono">{l.code}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AssetTransferPage() {
  const { getToken } = useAuth();
  const managementApi = useManagementApi();

  const { update: updateAssetRecord } = useAssetApi();

  const getTokenRef = React.useRef(getToken);
  getTokenRef.current = getToken;
  const loadAssetLookupsRef = React.useRef(managementApi.loadAssetLookups);
  loadAssetLookupsRef.current = managementApi.loadAssetLookups;

  // ── State ──────────────────────────────────────────────────────────────────
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [history, setHistory] = React.useState<AssetTransferResponse[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const [historyPage, setHistoryPage] = React.useState(0);
  const [historyTotalPages, setHistoryTotalPages] = React.useState(1);
  const [historyTotalElements, setHistoryTotalElements] = React.useState(0);
  const [historyPageSize, setHistoryPageSize] = React.useState(25);
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

  const [selectedAssetId, setSelectedAssetId] = React.useState("");
  const [transferType, setTransferType] = React.useState<TransferType>("both");
  const [newEmployeeId, setNewEmployeeId] = React.useState("");
  const [newLocationId, setNewLocationId] = React.useState("");
  const [transferDate, setTransferDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = React.useState("");

  // ── Data loaders ───────────────────────────────────────────────────────────
  const loadPageData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [assetRows, lookups] = await Promise.all([
        fetchAssets(getTokenRef.current),
        loadAssetLookupsRef.current(),
      ]);
      setAssets(Array.isArray(assetRows) ? assetRows : []);
      setEmployees(Array.isArray(lookups?.employees) ? lookups.employees : []);
      setLocations(Array.isArray(lookups?.locations) ? lookups.locations : []);
    } catch (err) {
      setError(getReadableErrorMessage(err, "Failed to load data."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = React.useCallback(
    async (page = 0, size?: number) => {
      setHistoryLoading(true);
      const pageSize = size ?? historyPageSize;
      try {
        const result = await fetchAssetTransfers(
          getTokenRef.current,
          page,
          pageSize,
        );
        const content = Array.isArray(result?.content) ? result.content : [];
        setHistory(content);
        setHistoryPage(page);
        setHistoryTotalPages(result?.totalPages ?? 1);
        setHistoryTotalElements(result?.totalElements ?? 0);
      } catch (err) {
        console.warn("Failed to load transfer history:", err);
      } finally {
        setHistoryLoading(false);
      }
    },
    [historyPageSize],
  );

  React.useEffect(() => {
    void loadPageData();
    void loadHistory(0);
  }, [loadPageData, loadHistory]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const selectedAsset = React.useMemo(
    () => assets.find((a) => a.id === selectedAssetId) ?? null,
    [assets, selectedAssetId],
  );

  React.useEffect(() => {
    setSuccess("");
    setError("");
    setNewEmployeeId("");
    setNewLocationId("");
  }, [selectedAssetId]);

  // ── Transfer handler ───────────────────────────────────────────────────────
  async function handleTransfer() {
    if (!selectedAsset) {
      setError("Please select an asset.");
      return;
    }
    if (!transferDate) {
      setError("Please select a transfer date.");
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

    // ── FIX: Validate asset ID is numeric before doing anything ───────────
    let numericAssetId: number;
    try {
      numericAssetId = parseAssetId(selectedAsset.id);
    } catch (err) {
      setError(getReadableErrorMessage(err, "Invalid asset ID."));
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Step 1 — Update the asset record (employee / location fields)
      const assetPayload = buildAssetPayload({
        asset: selectedAsset,
        transferType,
        newEmployeeId,
        newLocationId,
        locations,
      });

      const updatedAsset = await updateAssetRecord(
        selectedAsset.id,
        assetPayload,
      );

      // Step 2 — Create the transfer audit record
      // ── FIX: pass getTokenRef.current (GetTokenFn), not getToken directly ──
      // ── FIX: assetId uses numericAssetId validated above — no NaN risk ─────
      // ── FIX: TransferType / TransferDate use capital T to match the backend
      //         AssetTransferDTO field names exactly (Lombok @Data generates
      //         getTransferType() from `private String TransferType` — Jackson
      //         therefore expects the JSON key "TransferType" not "transferType")
      const dto: AssetTransferDTO = {
        assetId: { id: numericAssetId },
        TransferType: transferType, // capital T
        TransferDate: transferDate, // capital T, "YYYY-MM-DD"
        reason: reason.trim() || "N/A", // @NotNull — never empty
      };

      // Temporary debug — remove after confirming payload is correct
      console.log(
        "[handleTransfer] Sending DTO:",
        JSON.stringify(dto, null, 2),
      );

      const savedTransfer = await createAssetTransfer(getTokenRef.current, dto);

      // Update local asset list with the freshly updated record
      setAssets((prev) =>
        prev.map((item) => (item.id === updatedAsset.id ? updatedAsset : item)),
      );
      setSelectedAssetId(updatedAsset.id);

      // Prepend new transfer to top of history
      setHistory((prev) => [savedTransfer, ...prev]);

      // Reset form fields
      setTransferType("both");
      setNewEmployeeId("");
      setNewLocationId("");
      setTransferDate(new Date().toISOString().slice(0, 10));
      setReason("");

      setSuccess(
        `Transfer complete — ${updatedAsset.assetCode} is now assigned to ${
          updatedAsset.assignedTo || "nobody"
        } at ${updatedAsset.location || "no location"}.`,
      );
    } catch (err) {
      setError(getReadableErrorMessage(err, "Transfer failed."));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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
                {/* Asset */}
                <div className="space-y-2">
                  <Label>Select Asset *</Label>
                  <AssetCombobox
                    assets={assets}
                    value={selectedAssetId}
                    onChange={setSelectedAssetId}
                    disabled={submitting}
                  />
                </div>

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

                {/* Employee */}
                {(transferType === "employee" || transferType === "both") && (
                  <div className="space-y-2">
                    <Label>New Employee</Label>
                    <EmployeeCombobox
                      employees={employees}
                      value={newEmployeeId}
                      onChange={setNewEmployeeId}
                      disabled={submitting}
                    />
                  </div>
                )}

                {/* Location */}
                {(transferType === "location" || transferType === "both") && (
                  <div className="space-y-2">
                    <Label>New Location</Label>
                    <LocationCombobox
                      locations={locations}
                      value={newLocationId}
                      onChange={setNewLocationId}
                      disabled={submitting}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Reason / Notes</Label>
                  <Textarea
                    rows={4}
                    placeholder="Enter transfer reason..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void loadPageData();
                      void loadHistory(0);
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

            {/* ── Asset Details ── */}
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
                      {selectedAsset.supplierName && (
                        <div className="flex items-start gap-2">
                          <Package className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Supplier</p>
                            <p className="text-muted-foreground">
                              {selectedAsset.supplierName}
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transfer History</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {historyTotalElements} total record
                    {historyTotalElements !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => void loadHistory(0)}
                  disabled={historyLoading}
                  className="gap-2"
                >
                  {historyLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Repeat className="h-3.5 w-3.5" />
                  )}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="pl-6">Asset Code</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Serial No</TableHead>
                      <TableHead>Transfer Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="pr-6">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyLoading ? (
                      // Loading skeleton rows
                      Array.from({ length: historyPageSize }).map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 rounded bg-muted" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : history.length > 0 ? (
                      history.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          <TableCell className="pl-6 font-medium">
                            {item.asset.assetCode}
                          </TableCell>
                          <TableCell>
                            {item.asset.brand} {item.asset.model}
                          </TableCell>
                          <TableCell>{item.asset.serialNo || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {item.TransferType}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.TransferDate}</TableCell>
                          <TableCell className="pr-6 max-w-[200px] truncate text-muted-foreground">
                            {item.reason || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center text-muted-foreground"
                        >
                          No transfer history yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ── Table Footer ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                {/* Left: Showing X–Y of Z */}
                <span>
                  {historyTotalElements === 0
                    ? "No records"
                    : `Showing ${historyPage * historyPageSize + 1}–${Math.min(
                        (historyPage + 1) * historyPageSize,
                        historyTotalElements,
                      )} of ${historyTotalElements}`}
                </span>

                {/* Right: Rows per page + « ‹ Page X of Y › » */}
                <div className="flex items-center gap-4">
                  {/* Rows per page */}
                  <div className="flex items-center gap-2">
                    <span>Rows per page</span>
                    <Select
                      value={String(historyPageSize)}
                      onValueChange={(v) => {
                        const newSize = Number(v);
                        setHistoryPageSize(newSize);
                        void loadHistory(0, newSize);
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

                  {/* First / Prev / Page X of Y / Next / Last */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      type="button"
                      onClick={() => void loadHistory(0)}
                      disabled={historyPage === 0 || historyLoading}
                      title="First page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      type="button"
                      onClick={() => void loadHistory(historyPage - 1)}
                      disabled={historyPage === 0 || historyLoading}
                      title="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[90px] text-center text-sm text-muted-foreground">
                      Page {historyPage + 1} of {historyTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      type="button"
                      onClick={() => void loadHistory(historyPage + 1)}
                      disabled={
                        historyPage + 1 >= historyTotalPages || historyLoading
                      }
                      title="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      type="button"
                      onClick={() => void loadHistory(historyTotalPages - 1)}
                      disabled={
                        historyPage + 1 >= historyTotalPages || historyLoading
                      }
                      title="Last page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
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
