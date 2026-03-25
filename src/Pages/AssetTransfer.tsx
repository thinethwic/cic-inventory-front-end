// src/Pages/AssetTransferPage.tsx
import * as React from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Repeat,
  Search,
  Package,
  MapPin,
  User,
  FileText,
  Loader2,
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

import { useAssetApi } from "@/lib/api";
import {
  fetchAssetTransfers,
  createAssetTransfer,
  fetchAllPages,
  type AssetTransferResponse,
  type AssetTransferDTO,
  type GetTokenFn,
} from "@/lib/asset-transfer-api";
import type { Asset, AssetFormState, Employee, Location } from "@/types";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type TransferType = "employee" | "location" | "both";

// ── Query keys ────────────────────────────────────────────────────────────────
const QK = {
  assets: ["transfer-assets"] as const,
  employees: ["transfer-employees"] as const,
  locations: ["transfer-locations"] as const,
  transfers: (page: number, size: number) =>
    ["asset-transfers", page, size] as const,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "available":
      return "secondary";
    case "assigned":
      return "default";
    case "in Repair":
      return "outline";
    case "damaged":
      return "outline";
    case "disposed":
    case "retired":
      return "destructive";
    default:
      return "outline";
  }
}

function extractName(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "object" && "name" in (raw as object))
    return String((raw as { name: unknown }).name) || null;
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
interface AssetComboboxProps {
  assets: Asset[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function AssetCombobox({
  assets,
  value,
  onChange,
  disabled,
  loading,
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
        extractName(a.location as unknown),
        extractName(a.assignedTo as unknown),
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
          disabled={disabled || loading}
          type="button"
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading assets...
            </span>
          ) : selected ? (
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
              const locationName = extractName(a.location as unknown);
              const assignedToName = extractName(a.assignedTo as unknown);
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
  loading?: boolean;
}

function EmployeeCombobox({
  employees,
  value,
  onChange,
  disabled,
  loading,
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
          disabled={disabled || loading}
          type="button"
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading employees...
            </span>
          ) : selected ? (
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
  loading?: boolean;
}

function LocationCombobox({
  locations,
  value,
  onChange,
  disabled,
  loading,
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
          disabled={disabled || loading}
          type="button"
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading locations...
            </span>
          ) : selected ? (
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
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AssetTransferPage() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const { update: updateAssetRecord } = useAssetApi();

  const getTokenRef = React.useRef<GetTokenFn>(getToken);

  // ── Pagination state ───────────────────────────────────────────────────────
  const [historyPage, setHistoryPage] = React.useState(0);
  const [historyPageSize, setHistoryPageSize] = React.useState(25);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [selectedAssetId, setSelectedAssetId] = React.useState("");
  const [transferType, setTransferType] = React.useState<TransferType>("both");
  const [newEmployeeId, setNewEmployeeId] = React.useState("");
  const [newLocationId, setNewLocationId] = React.useState("");
  const [transferDate, setTransferDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = React.useState("");

  // ── React Query: lookups ───────────────────────────────────────────────────
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: QK.assets,
    queryFn: () => fetchAllPages<Asset>(getTokenRef.current, "/assets"),
    staleTime: 1000 * 60 * 2,
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: QK.employees,
    queryFn: () => fetchAllPages<Employee>(getTokenRef.current, "/employees"),
    staleTime: 1000 * 60 * 2,
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: QK.locations,
    queryFn: () => fetchAllPages<Location>(getTokenRef.current, "/locations"),
    staleTime: 1000 * 60 * 2,
  });

  // ── React Query: transfer history (server-side paginated) ──────────────────
  const {
    data: transferPage,
    isLoading: historyLoading,
    isFetching: historyFetching,
  } = useQuery({
    queryKey: QK.transfers(historyPage, historyPageSize),
    queryFn: () =>
      fetchAssetTransfers(getTokenRef.current, historyPage, historyPageSize),
    placeholderData: keepPreviousData,
  });

  const history: AssetTransferResponse[] = transferPage?.content ?? [];
  const historyTotalPages = transferPage?.totalPages ?? 1;
  const historyTotalElements = transferPage?.totalElements ?? 0;

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedAsset = React.useMemo(
    () => assets.find((a) => a.id === selectedAssetId) ?? null,
    [assets, selectedAssetId],
  );

  React.useEffect(() => {
    setNewEmployeeId("");
    setNewLocationId("");
  }, [selectedAssetId]);

  // ── Transfer mutation ──────────────────────────────────────────────────────
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAsset) throw new Error("Please select an asset.");
      if (!transferDate) throw new Error("Please select a transfer date.");
      if (
        (transferType === "employee" || transferType === "both") &&
        !newEmployeeId
      )
        throw new Error("Please select a new employee.");
      if (
        (transferType === "location" || transferType === "both") &&
        !newLocationId
      )
        throw new Error("Please select a new location.");
      if (
        (transferType === "employee" || transferType === "both") &&
        selectedAsset.assignedToId &&
        selectedAsset.assignedToId === newEmployeeId
      )
        throw new Error("Asset is already assigned to this employee.");
      if (
        (transferType === "location" || transferType === "both") &&
        selectedAsset.locationId &&
        selectedAsset.locationId === newLocationId
      )
        throw new Error("Asset is already at this location.");

      const numericAssetId = parseInt(selectedAsset.id, 10);
      if (isNaN(numericAssetId)) throw new Error("Invalid asset ID.");

      const isEmployeeTransfer =
        transferType === "employee" || transferType === "both";
      const isLocationTransfer =
        transferType === "location" || transferType === "both";

      const resolvePrevEmployeeId = (): number | null => {
        if (!isEmployeeTransfer) return null;
        if (selectedAsset.assignedToId) {
          const p = parseInt(String(selectedAsset.assignedToId), 10);
          if (!isNaN(p)) return p;
        }
        const raw = selectedAsset.assignedTo as unknown;
        if (raw && typeof raw === "object" && "id" in (raw as object)) {
          const p = parseInt(String((raw as { id: unknown }).id), 10);
          if (!isNaN(p)) return p;
        }
        const nameStr = typeof raw === "string" ? raw : null;
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
          const p = parseInt(String(selectedAsset.locationId), 10);
          if (!isNaN(p)) return p;
        }
        const raw = selectedAsset.location as unknown;
        if (raw && typeof raw === "object" && "id" in (raw as object)) {
          const p = parseInt(String((raw as { id: unknown }).id), 10);
          if (!isNaN(p)) return p;
        }
        const nameStr = typeof raw === "string" ? raw : null;
        if (nameStr) {
          const match = locations.find(
            (l) =>
              l.name?.trim().toLowerCase() === nameStr.trim().toLowerCase(),
          );
          if (match) return Number(match.id);
        }
        return null;
      };

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
          isEmployeeTransfer && resolvePrevEmployeeId()
            ? { id: resolvePrevEmployeeId()! }
            : null,
        toEmployeeId:
          isEmployeeTransfer && newEmployeeId
            ? { id: parseInt(newEmployeeId, 10) }
            : null,
        fromLocationId:
          isLocationTransfer && resolvePrevLocationId()
            ? { id: resolvePrevLocationId()! }
            : null,
        toLocationId:
          isLocationTransfer && newLocationId
            ? { id: parseInt(newLocationId, 10) }
            : null,
      };

      await createAssetTransfer(getTokenRef.current, dto);
      return updatedAsset;
    },
    onSuccess: (updatedAsset) => {
      // Invalidate both lookups and history
      void qc.invalidateQueries({ queryKey: QK.assets });
      void qc.invalidateQueries({ queryKey: ["asset-transfers"] });

      setTransferType("both");
      setNewEmployeeId("");
      setNewLocationId("");
      setTransferDate(new Date().toISOString().slice(0, 10));
      setReason("");
      setSelectedAssetId(updatedAsset.id);

      toast.success("Transfer complete", {
        description: `${updatedAsset.assetCode} is now assigned to ${
          extractName(updatedAsset.assignedTo as unknown) || "nobody"
        } at ${extractName(updatedAsset.location as unknown) || "no location"}.`,
      });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Transfer failed.";
      toast.error("Transfer failed", { description: msg });
    },
  });

  const pageLoading = assetsLoading || employeesLoading || locationsLoading;

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

      {pageLoading ? (
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
                    assets={assets}
                    value={selectedAssetId}
                    onChange={setSelectedAssetId}
                    disabled={transferMutation.isPending}
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

                {(transferType === "employee" || transferType === "both") && (
                  <div className="space-y-2">
                    <Label>New Employee</Label>
                    <EmployeeCombobox
                      employees={employees}
                      value={newEmployeeId}
                      onChange={setNewEmployeeId}
                      disabled={transferMutation.isPending}
                      loading={employeesLoading}
                    />
                  </div>
                )}

                {(transferType === "location" || transferType === "both") && (
                  <div className="space-y-2">
                    <Label>New Location</Label>
                    <LocationCombobox
                      locations={locations}
                      value={newLocationId}
                      onChange={setNewLocationId}
                      disabled={transferMutation.isPending}
                      loading={locationsLoading}
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
                      void qc.invalidateQueries({ queryKey: QK.assets });
                      void qc.invalidateQueries({ queryKey: QK.employees });
                      void qc.invalidateQueries({ queryKey: QK.locations });
                      void qc.invalidateQueries({
                        queryKey: ["asset-transfers"],
                      });
                    }}
                    disabled={transferMutation.isPending}
                  >
                    Refresh Data
                  </Button>
                  <Button
                    type="button"
                    onClick={() => transferMutation.mutate()}
                    disabled={transferMutation.isPending}
                    className="gap-2"
                  >
                    {transferMutation.isPending ? (
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
                  onClick={() =>
                    void qc.invalidateQueries({ queryKey: ["asset-transfers"] })
                  }
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
                      Array.from({ length: historyPageSize }).map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          {Array.from({ length: 10 }).map((_, j) => (
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
                          No transfer history yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination footer */}
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
                        setHistoryPageSize(Number(v));
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
                      size="icon"
                      className="h-8 w-8"
                      type="button"
                      onClick={() => setHistoryPage(0)}
                      disabled={historyPage === 0 || historyFetching}
                      title="First page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
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
                      size="icon"
                      className="h-8 w-8"
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
                      size="icon"
                      className="h-8 w-8"
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
