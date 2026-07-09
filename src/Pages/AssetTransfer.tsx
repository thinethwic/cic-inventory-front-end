// src/Pages/AssetTransferPage.tsx
import * as React from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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
  Inbox,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useAssetApi } from "@/lib/api";
import {
  fetchAssetTransfers,
  createAssetTransfer,
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

function extractName(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "object" && "name" in (raw as object)) {
    return String((raw as { name: unknown }).name) || null;
  }
  if (typeof raw === "string") return raw || null;
  return null;
}

function buildAssetPayload(args: {
  asset: Asset;
  transferType: TransferType;
  newEmployeeId: string;
  newLocationId: string;
  locations: Location[];
}): AssetFormState {
  const { asset, transferType, newEmployeeId, newLocationId, locations } = args;

  const nextEmployeeId =
    transferType === "employee" || transferType === "both"
      ? newEmployeeId
      : asset.assignedToId || "";

  const resolveCurrentLocationId = (): string => {
    if (asset.locationId) return asset.locationId;
    if (!asset.location) return "";
    const match = locations.find(
      (l) =>
        l.name?.trim().toLowerCase() === asset.location.trim().toLowerCase(),
    );
    return match ? String(match.id) : "";
  };

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
    status: nextEmployeeId ? "Assigned" : asset.status,
    locationId: nextLocationId,
    assignedToId: nextEmployeeId,
    purchaseDate: asset.purchaseDate ?? "",
    warrantyEnd: asset.warrantyEnd ?? "",
    supplierId: asset.supplierId != null ? String(asset.supplierId) : "",
  };
}

// ── Searchable Asset Combobox ─────────────────────────────────────────────────
// Searches the server as the user types (small pages) instead of preloading
// the entire asset table up front — the previous version fetched up to 1000
// assets just to populate this one dropdown.
interface AssetComboboxProps {
  selectedAsset: Asset | null;
  onSelect: (asset: Asset) => void;
  disabled?: boolean;
}

function AssetCombobox({
  selectedAsset,
  onSelect,
  disabled,
}: AssetComboboxProps) {
  const { getPage } = useAssetApi();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [results, setResults] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getPage({ search: debouncedSearch, size: 20 })
      .then((page) => {
        if (!cancelled) setResults(page.content);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch, getPage]);

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
            !selectedAsset && "text-muted-foreground",
          )}
        >
          {selectedAsset ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-medium text-foreground">
                {selectedAsset.assetCode}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="truncate text-muted-foreground">
                {selectedAsset.brand} {selectedAsset.model}
              </span>
              {selectedAsset.serialNo && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {selectedAsset.serialNo}
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
          {loading && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {!loading && results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No assets found.
            </div>
          ) : (
            results.map((a) => {
              const isSelected = a.id === selectedAsset?.id;
              const locationName = extractName(a.location as unknown);
              const assignedToName = extractName(a.assignedTo as unknown);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onSelect(a);
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
                      {locationName && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {locationName}
                        </span>
                      )}
                      {assignedToName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {assignedToName}
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
  filteredByLocation?: boolean;
  locationName?: string;
}

function EmployeeCombobox({
  employees,
  value,
  onChange,
  disabled,
  filteredByLocation,
  locationName,
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
    <div className="space-y-1.5">
      {filteredByLocation && locationName && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          Showing employees at{" "}
          <span className="font-medium text-foreground">{locationName}</span>
          {employees.length === 0 && (
            <span className="text-destructive"> — no employees found</span>
          )}
        </p>
      )}

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
                <span className="truncate text-foreground">
                  {selected.name}
                </span>
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
              placeholder="Search by ID, name, department..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {filteredByLocation && locationName
                  ? `No employees found at ${locationName}.`
                  : "No employees found."}
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
    </div>
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
  const queryClient = useQueryClient();

  const getTokenRef = React.useRef(getToken);
  getTokenRef.current = getToken;

  // ── State ──────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const [historyPage, setHistoryPage] = React.useState(0);
  const [historyPageSize, setHistoryPageSize] = React.useState(25);
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);
  const [transferType, setTransferType] = React.useState<TransferType>("both");
  const [newEmployeeId, setNewEmployeeId] = React.useState("");
  const [newLocationId, setNewLocationId] = React.useState("");
  const [transferDate, setTransferDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = React.useState("");

  // ── Lookups (employees/locations) ───────────────────────────────────────────
  // Cached for 5 minutes via React Query so repeat visits to this page (and
  // "Refresh Data" clicks elsewhere) don't always re-fetch the full tables —
  // the asset picker itself already avoids this by searching the server as
  // the user types instead of requiring every asset to be fetched up front.
  const {
    data: lookups,
    isLoading: lookupsLoading,
    isError: lookupsErrored,
    error: lookupsError,
    refetch: refetchLookups,
  } = useQuery({
    queryKey: ["transfer-lookups"],
    queryFn: () => managementApi.loadTransferLookups(),
    staleTime: 1000 * 60 * 5,
  });
  const employees = React.useMemo(() => lookups?.employees ?? [], [lookups]);
  const locations = React.useMemo(() => lookups?.locations ?? [], [lookups]);

  // ── Transfer history (paginated) ────────────────────────────────────────────
  // keepPreviousData avoids a full skeleton flash when turning pages — the
  // previous page's rows stay on screen (dimmed via isFetching) until the
  // next page resolves.
  const {
    data: historyPageData,
    isLoading: historyLoading,
    isFetching: historyFetching,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["asset-transfer-history", historyPage, historyPageSize],
    queryFn: () =>
      fetchAssetTransfers(getTokenRef.current, historyPage, historyPageSize),
    placeholderData: keepPreviousData,
  });
  const history = historyPageData?.content ?? [];
  const historyTotalPages = historyPageData?.totalPages ?? 1;
  const historyTotalElements = historyPageData?.totalElements ?? 0;

  // ── Resolve the asset's current location id (handles flat id or nested obj)
  const assetLocationId = React.useMemo((): string | null => {
    if (!selectedAsset) return null;

    if (selectedAsset.locationId) return String(selectedAsset.locationId);

    const locRaw = selectedAsset.location as unknown;
    if (locRaw && typeof locRaw === "object" && "id" in (locRaw as object)) {
      return String((locRaw as { id: unknown }).id);
    }

    if (typeof locRaw === "string" && locRaw) {
      const match = locations.find(
        (l) => l.name?.trim().toLowerCase() === locRaw.trim().toLowerCase(),
      );
      return match ? String(match.id) : null;
    }

    return null;
  }, [selectedAsset, locations]);

  // ── Employees filtered by location ────────────────────────────────────────
  // "both" mode  → filter by newly selected location (newLocationId)
  // "employee"   → filter by asset's current location (assetLocationId)
  const locationFilteredEmployees = React.useMemo(() => {
    if (transferType === "both") {
      if (!newLocationId) return employees; // no new location yet → show all
      return employees.filter(
        (e) =>
          e.location?.id != null && String(e.location.id) === newLocationId,
      );
    }
    if (!assetLocationId) return employees;
    return employees.filter(
      (e) =>
        e.location?.id != null && String(e.location.id) === assetLocationId,
    );
  }, [employees, assetLocationId, transferType, newLocationId]);

  // ── Location name shown in the employee combobox hint ─────────────────────
  const employeeFilterLocationName = React.useMemo(() => {
    const filterById =
      transferType === "both" ? newLocationId : assetLocationId;
    if (!filterById) return null;
    return locations.find((l) => String(l.id) === filterById)?.name ?? null;
  }, [transferType, newLocationId, assetLocationId, locations]);

  // ── Clear selected employee when new location changes in "both" mode ──────
  React.useEffect(() => {
    if (transferType === "both") {
      setNewEmployeeId("");
    }
  }, [newLocationId, transferType]);

  // ── Reset form fields when asset selection changes ─────────────────────────
  React.useEffect(() => {
    setSuccess("");
    setError("");
    setNewEmployeeId("");
    setNewLocationId("");
  }, [selectedAsset?.id]);

  // ── Transfer handler ───────────────────────────────────────────────────────
  async function handleTransfer() {
    // Replace every early-return setError block like this pattern:
    if (!selectedAsset) {
      setError("Please select an asset.");
      toast.error("Please select an asset."); // ← ADD
      return;
    }
    if (!transferDate) {
      setError("Please select a transfer date.");
      toast.error("Please select a transfer date."); // ← ADD
      return;
    }
    if (
      (transferType === "employee" || transferType === "both") &&
      !newEmployeeId
    ) {
      setError("Please select a new employee.");
      toast.error("Please select a new employee."); // ← ADD
      return;
    }
    if (
      (transferType === "location" || transferType === "both") &&
      !newLocationId
    ) {
      setError("Please select a new location.");
      toast.error("Please select a new location."); // ← ADD
      return;
    }
    if (transferType === "employee" || transferType === "both") {
      if (
        selectedAsset.assignedToId &&
        selectedAsset.assignedToId === newEmployeeId
      ) {
        setError("Asset is already assigned to this employee.");
        toast.error("Asset is already assigned to this employee."); // ← ADD
        return;
      }
    }
    if (transferType === "location" || transferType === "both") {
      if (
        selectedAsset.locationId &&
        selectedAsset.locationId === newLocationId
      ) {
        setError("Asset is already at this location.");
        toast.error("Asset is already at this location."); // ← ADD
        return;
      }
    }
    const numericAssetId = parseInt(selectedAsset.id, 10);
    if (isNaN(numericAssetId)) {
      setError("Invalid asset ID.");
      toast.error("Invalid asset ID."); // ← ADD
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const isEmployeeTransfer =
        transferType === "employee" || transferType === "both";
      const isLocationTransfer =
        transferType === "location" || transferType === "both";

      const resolvePrevEmployeeId = (): number | null => {
        if (!isEmployeeTransfer) return null;
        if (selectedAsset.assignedToId) {
          const parsed = parseInt(String(selectedAsset.assignedToId), 10);
          if (!isNaN(parsed)) return parsed;
        }
        const assignedToRaw = selectedAsset.assignedTo as unknown;
        if (
          assignedToRaw &&
          typeof assignedToRaw === "object" &&
          "id" in (assignedToRaw as object)
        ) {
          const parsed = parseInt(
            String((assignedToRaw as { id: unknown }).id),
            10,
          );
          if (!isNaN(parsed)) return parsed;
        }
        const nameStr =
          typeof assignedToRaw === "string" ? assignedToRaw : null;
        if (nameStr) {
          const namePart = nameStr.includes(" - ")
            ? nameStr.split(" - ").slice(1).join(" - ").trim()
            : nameStr.trim();
          const match = employees.find(
            (e) =>
              e.name?.trim().toLowerCase() === namePart.toLowerCase() ||
              `${e.empId} - ${e.name}`.toLowerCase() ===
                nameStr.trim().toLowerCase(),
          );
          if (match) return Number(match.id);
        }
        return null;
      };

      const resolvePrevLocationId = (): number | null => {
        if (!isLocationTransfer) return null;
        if (selectedAsset.locationId) {
          const parsed = parseInt(String(selectedAsset.locationId), 10);
          if (!isNaN(parsed)) return parsed;
        }
        const locationRaw = selectedAsset.location as unknown;
        if (
          locationRaw &&
          typeof locationRaw === "object" &&
          "id" in (locationRaw as object)
        ) {
          const parsed = parseInt(
            String((locationRaw as { id: unknown }).id),
            10,
          );
          if (!isNaN(parsed)) return parsed;
        }
        const nameStr = typeof locationRaw === "string" ? locationRaw : null;
        if (nameStr) {
          const match = locations.find(
            (l) =>
              l.name?.trim().toLowerCase() === nameStr.trim().toLowerCase(),
          );
          if (match) return Number(match.id);
        }
        return null;
      };

      const prevEmployeeNumericId = resolvePrevEmployeeId();
      const prevLocationNumericId = resolvePrevLocationId();

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

      const dto: AssetTransferDTO = {
        assetId: { id: numericAssetId },
        TransferType: transferType,
        TransferDate: transferDate,
        reason: reason.trim() || "N/A",
        fromEmployeeId:
          isEmployeeTransfer && prevEmployeeNumericId
            ? { id: prevEmployeeNumericId }
            : null,
        toEmployeeId:
          isEmployeeTransfer && newEmployeeId
            ? { id: parseInt(newEmployeeId, 10) }
            : null,
        fromLocationId:
          isLocationTransfer && prevLocationNumericId
            ? { id: prevLocationNumericId }
            : null,
        toLocationId:
          isLocationTransfer && newLocationId
            ? { id: parseInt(newLocationId, 10) }
            : null,
      };

      await createAssetTransfer(getTokenRef.current, dto);

      setSelectedAsset(updatedAsset);
      void queryClient.invalidateQueries({ queryKey: ["asset-transfer-history"] });

      setTransferType("both");
      setNewEmployeeId("");
      setNewLocationId("");
      setTransferDate(new Date().toISOString().slice(0, 10));
      setReason("");

      setSuccess(
        `Transfer complete — ${updatedAsset.assetCode} is now assigned to ${
          extractName(updatedAsset.assignedTo as unknown) || "nobody"
        } at ${extractName(updatedAsset.location as unknown) || "no location"}.`,
      );
      toast.success("Transfer complete", {
        description: `${updatedAsset.assetCode} → ${
          extractName(updatedAsset.assignedTo as unknown) || "unassigned"
        } at ${extractName(updatedAsset.location as unknown) || "no location"}`,
      });
    } catch (err) {
      const msg = getReadableErrorMessage(err, "Transfer failed.");
      setError(msg);
      toast.error("Transfer failed", { description: msg }); // ← ADD
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
      {(error || lookupsErrored) && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            {error ||
              getReadableErrorMessage(lookupsError, "Failed to load data.")}
          </AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Transfer Successful</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {lookupsLoading ? (
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
                <div className="space-y-2">
                  <Label>Select Asset *</Label>
                  <AssetCombobox
                    selectedAsset={selectedAsset}
                    onSelect={setSelectedAsset}
                    disabled={submitting}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Transfer Type</Label>
                    <Select
                      value={transferType}
                      onValueChange={(v) => {
                        setTransferType(v as TransferType);
                        setNewEmployeeId("");
                      }}
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

                {/* Location picker — shown first in "both" mode so employee list can filter */}
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

                {/* Employee picker — filtered to newly selected location in "both" mode */}
                {(transferType === "employee" || transferType === "both") && (
                  <div className="space-y-2">
                    <Label>New Employee</Label>
                    <EmployeeCombobox
                      employees={locationFilteredEmployees}
                      value={newEmployeeId}
                      onChange={setNewEmployeeId}
                      disabled={submitting}
                      filteredByLocation={
                        transferType === "both"
                          ? !!newLocationId
                          : !!selectedAsset
                      }
                      locationName={employeeFilterLocationName ?? undefined}
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
                      void refetchLookups();
                      void refetchHistory();
                    }}
                    disabled={lookupsLoading || submitting}
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
                            {extractName(selectedAsset.assignedTo as unknown) ||
                              "Not assigned"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Current Location</p>
                          <p className="text-muted-foreground">
                            {extractName(selectedAsset.location as unknown) ||
                              "No location"}
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
                            {selectedAsset.serialNo || "—"}
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
                  onClick={() => void refetchHistory()}
                  disabled={historyFetching}
                  className="gap-2"
                >
                  {historyFetching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Repeat className="h-3.5 w-3.5" />
                  )}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="pl-6">Asset Code</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Serial No</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>From Employee</TableHead>
                      <TableHead>To Employee</TableHead>
                      <TableHead>From Location</TableHead>
                      <TableHead>To Location</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="pr-6">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyLoading ? (
                      Array.from({ length: Math.min(historyPageSize, 10) }).map(
                        (_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 10 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ),
                      )
                    ) : history.length > 0 ? (
                      history.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          <TableCell className="pl-6 font-medium">
                            {item.asset.assetCode}
                          </TableCell>
                          <TableCell>
                            {item.asset.brand} {item.asset.model}
                          </TableCell>
                          <TableCell>{item.asset.serialNo || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {item.TransferType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.fromEmployee ? (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3 shrink-0" />
                                {item.fromEmployee.name}
                              </span>
                            ) : (
                              <span className="text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.toEmployee ? (
                              <span className="flex items-center gap-1 font-medium">
                                <User className="h-3 w-3 shrink-0" />
                                {item.toEmployee.name}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.fromLocation ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {item.fromLocation.name}
                              </span>
                            ) : (
                              <span className="text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.toLocation ? (
                              <span className="flex items-center gap-1 font-medium">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {item.toLocation.name}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {item.TransferDate}
                          </TableCell>
                          <TableCell className="pr-6 max-w-[160px] truncate text-muted-foreground">
                            {item.reason || "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="h-32 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                              <Inbox className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <p>No transfer history yet.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ── Pagination footer ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {historyTotalElements === 0
                    ? "No results"
                    : `Showing ${historyPage * historyPageSize + 1}–${Math.min(
                        (historyPage + 1) * historyPageSize,
                        historyTotalElements,
                      )} of ${historyTotalElements}`}
                </p>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Rows per page
                    </span>
                    <Select
                      value={String(historyPageSize)}
                      onValueChange={(v) => {
                        const newSize = Number(v);
                        setHistoryPageSize(newSize);
                        setHistoryPage(0);
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
                      size="icon-sm"
                      type="button"
                      onClick={() => setHistoryPage(0)}
                      disabled={historyPage === 0 || historyFetching}
                      title="First page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      type="button"
                      onClick={() => setHistoryPage((p) => p - 1)}
                      disabled={historyPage === 0 || historyFetching}
                      title="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[90px] text-center text-sm text-muted-foreground">
                      Page {historyPage + 1} of {historyTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      type="button"
                      onClick={() => setHistoryPage((p) => p + 1)}
                      disabled={
                        historyPage + 1 >= historyTotalPages || historyFetching
                      }
                      title="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      type="button"
                      onClick={() => setHistoryPage(historyTotalPages - 1)}
                      disabled={
                        historyPage + 1 >= historyTotalPages || historyFetching
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
