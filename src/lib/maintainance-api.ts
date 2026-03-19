// src/lib/maintainance-api.ts
import * as React from "react";
import { useAuth } from "@clerk/clerk-react";
import type { Asset, Supplier } from "@/types";
import type {
    Maintenance,
    MaintenanceFormState,
    MaintenanceStatus,
    MaintenancePriority,
} from "@/types";

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const API_BASE = `${BASE_URL}/api/v1`;
const JWT_TEMPLATE = "cic-inventory";

// ─── Spring Page wrapper ──────────────────────────────────────────────────────
export type SpringPage<T> = {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
};

// ─── Core fetch helper ────────────────────────────────────────────────────────
async function apiFetch<T>(
    token: string,
    endpoint: string,
    init: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    let res: Response;
    try {
        res = await fetch(url, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(init.headers ?? {}),
                Authorization: `Bearer ${token}`,
            },
        });
    } catch (networkErr) {
        throw new Error(
            `Network error — is the backend running? (${String(networkErr)})`
        );
    }

    if (res.status === 204) return undefined as T;

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
        if (isJson) {
            const body = await res.json().catch(() => ({}));
            const msg = body?.message ?? body?.error ?? JSON.stringify(body);
            throw new Error(`API ${res.status}: ${msg}`);
        }
        throw new Error(`API ${res.status} — backend returned non-JSON response.`);
    }

    if (!isJson) {
        throw new Error(`Expected JSON from ${url} but got "${contentType}".`);
    }

    return res.json() as Promise<T>;
}

function reqBody(payload: unknown): RequestInit {
    return { body: JSON.stringify(payload) };
}

// ─── Explicit status map ──────────────────────────────────────────────────────
const STATUS_TO_BACKEND: Record<string, string> = {
    "Open": "OPEN",
    "In Progress": "IN_PROGRESS",
    "Completed": "COMPLETED",
    "Cancelled": "CANCELLED",
    "Cannot Repair": "CANNOT_REPAIR",
};

// ─── Frontend → Backend DTO ───────────────────────────────────────────────────
// Matches backend DTO exactly:
//   ticketNo      @NotBlank  — omitted on create (auto-generated), included on update
//   assetId       @NotNull
//   issueTitle    nullable string
//   description   nullable string
//   priority      @NotNull enum
//   status        @NotNull enum
//   reportedDate  @NotNull LocalDate
//   dueDate       nullable LocalDate
//   assignedTo    nullable string
//   cost          nullable BigDecimal
//   notes         nullable string
function toBackendDto(dto: MaintenanceFormState): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        assetId: Number(dto.assetId),
        issueTitle: dto.issueTitle?.trim() || null,
        description: dto.description?.trim() || null,
        priority: dto.priority?.toUpperCase(),
        status: STATUS_TO_BACKEND[dto.status] ?? dto.status?.toUpperCase().replace(/\s+/g, "_"),
        reportedDate: dto.reportedDate,
        dueDate: dto.dueDate || null,
        assignedTo: dto.assignedTo?.trim() || null,
        cost: dto.cost ?? null,
        notes: dto.notes?.trim() || null,
    };

    // ticketNo is @NotBlank — only include on update (when it already exists)
    // On create the backend auto-generates it so we omit it entirely
    if (dto.ticketNo?.trim()) {
        payload.ticketNo = dto.ticketNo.trim();
    }

    return payload;
}

// ─── Backend → Frontend ───────────────────────────────────────────────────────
const STATUS_MAP: Record<string, MaintenanceStatus> = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    CANNOT_REPAIR: "Cannot Repair",
};

const PRIORITY_MAP: Record<string, MaintenancePriority> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
};

function fromBackendRow(raw: Record<string, unknown>): Maintenance {
    const asset = raw.asset as Record<string, unknown> | undefined;
    const supplier = raw.supplier as Record<string, unknown> | undefined;

    return {
        id: String(raw.id),
        ticketNo: (raw.ticketNo as string) ?? "",
        assetId: asset?.id != null ? String(asset.id) : String(raw.assetId ?? ""),
        assetCode: (asset?.assetCode as string) ?? "",
        supplierId: supplier?.id != null ? String(supplier.id) : undefined,
        supplierName: (supplier?.name as string) ?? undefined,
        issueTitle: (raw.issueTitle as string) ?? "",
        description: (raw.description as string) ?? "",
        priority: (PRIORITY_MAP[raw.priority as string] ?? raw.priority) as MaintenancePriority,
        status: (STATUS_MAP[raw.status as string] ?? raw.status) as MaintenanceStatus,
        reportedDate: (raw.reportedDate as string) ?? "",
        dueDate: (raw.dueDate as string) ?? "",
        assignedTo: (raw.assignedTo as string) ?? "",
        cost: raw.cost as number | undefined,
        notes: (raw.notes as string) ?? "",
    };
}

function fromBackendPage(
    page: SpringPage<Record<string, unknown>>
): SpringPage<Maintenance> {
    return { ...page, content: page.content.map(fromBackendRow) };
}

// ─── Supplier mapper ──────────────────────────────────────────────────────────
function fromBackendSupplier(raw: Record<string, unknown>): Supplier {
    return {
        id: Number(raw.id),
        name: (raw.name ?? raw.supplierName ?? raw.companyName ?? "") as string,
        contactPerson: (raw.contactPerson ?? raw.contact ?? undefined) as string | undefined,
    };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useMaintenanceApi() {
    const { getToken } = useAuth();

    const withToken = React.useCallback(
        async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
            const token = await getToken({ template: JWT_TEMPLATE });
            if (!token) throw new Error("Not authenticated");
            return fn(token);
        },
        [getToken]
    );

    // GET all tickets
    const getAll = React.useCallback(
        (page = 0, size = 100) =>
            withToken((t) =>
                apiFetch<SpringPage<Record<string, unknown>>>(
                    t,
                    `/maintenances?page=${page}&size=${size}&sort=id,desc`
                ).then(fromBackendPage)
            ),
        [withToken]
    );

    // POST — ticketNo omitted, backend auto-generates it
    const create = React.useCallback(
        (dto: MaintenanceFormState) =>
            withToken((t) =>
                apiFetch<Record<string, unknown>>(t, "/maintenances", {
                    method: "POST",
                    ...reqBody(toBackendDto(dto)),
                }).then(fromBackendRow)
            ),
        [withToken]
    );

    // PUT — ticketNo included (satisfies @NotBlank)
    const update = React.useCallback(
        (id: string, dto: MaintenanceFormState) =>
            withToken((t) =>
                apiFetch<Record<string, unknown>>(t, `/maintenances/${id}`, {
                    method: "PUT",
                    ...reqBody(toBackendDto(dto)),
                }).then(fromBackendRow)
            ),
        [withToken]
    );

    // DELETE
    const remove = React.useCallback(
        (id: string) =>
            withToken((t) =>
                apiFetch<void>(t, `/maintenances/${id}`, { method: "DELETE" })
            ),
        [withToken]
    );

    // PUT with status = Completed — ticketNo carried from existing record
    const markCompleted = React.useCallback(
        (id: string, existing: Maintenance) =>
            withToken((t) =>
                apiFetch<Record<string, unknown>>(t, `/maintenances/${id}`, {
                    method: "PUT",
                    ...reqBody(toBackendDto({ ...existing, status: "Completed" })),
                }).then(fromBackendRow)
            ),
        [withToken]
    );

    // GET assets for combobox
    const getAssets = React.useCallback(
        (page = 0, size = 200) =>
            withToken((t) =>
                apiFetch<SpringPage<Asset>>(t, `/assets?page=${page}&size=${size}`)
            ),
        [withToken]
    );

    // GET suppliers for combobox
    const getSuppliers = React.useCallback(
        (page = 0, size = 200) =>
            withToken((t) =>
                apiFetch<SpringPage<Record<string, unknown>>>(
                    t,
                    `/suppliers?page=${page}&size=${size}&sort=name,asc`
                ).then((p) => ({
                    ...p,
                    content: p.content.map(fromBackendSupplier),
                }))
            ),
        [withToken]
    );

    return { getAll, create, update, remove, markCompleted, getAssets, getSuppliers };
}