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
import type { SpringPage } from "@/lib/asset-transfer-api";

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const API_BASE = `${BASE_URL}/api/v1`;
const JWT_TEMPLATE = "cic-inventory";

// ─── Core fetch helper ────────────────────────────────────────────────────────
async function apiFetch<T>(
    token: string,
    endpoint: string,
    init: RequestInit = {},
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
            `Network error — is the backend running? (${String(networkErr)})`,
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

// ─── Status maps ──────────────────────────────────────────────────────────────
const STATUS_TO_BACKEND: Record<string, string> = {
    Open: "OPEN",
    "In Progress": "IN_PROGRESS",
    Completed: "COMPLETED",
    Cancelled: "CANCELLED",
    "Cannot Repair": "CANNOT_REPAIR",
};

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

// ─── Frontend → Backend DTO ───────────────────────────────────────────────────
function toBackendDto(dto: MaintenanceFormState): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        assetId: Number(dto.assetId),
        issueTitle: dto.issueTitle?.trim() || null,
        description: dto.description?.trim() || null,
        priority: dto.priority?.toUpperCase(),
        status:
            STATUS_TO_BACKEND[dto.status] ??
            dto.status?.toUpperCase().replace(/\s+/g, "_"),
        reportedDate: dto.reportedDate,
        dueDate: dto.dueDate || null,
        assignedTo: dto.assignedTo?.trim() || null,
        cost: dto.cost ?? null,
        notes: dto.notes?.trim() || null,
    };

    if (dto.ticketNo?.trim()) {
        payload.ticketNo = dto.ticketNo.trim();
    }

    return payload;
}

// ─── Backend → Frontend ───────────────────────────────────────────────────────
function fromBackendRow(raw: Record<string, unknown>): Maintenance {
    const asset = raw.asset as Record<string, unknown> | undefined;
    const supplier = raw.supplier as Record<string, unknown> | undefined;

    return {
        id: String(raw.id),
        ticketNo: (raw.ticketNo as string) ?? "",
        assetId:
            asset?.id != null ? String(asset.id) : String(raw.assetId ?? ""),
        assetCode: (asset?.assetCode as string) ?? "",
        supplierId: supplier?.id != null ? String(supplier.id) : undefined,
        supplierName: (supplier?.name as string) ?? undefined,
        issueTitle: (raw.issueTitle as string) ?? "",
        description: (raw.description as string) ?? "",
        priority: (PRIORITY_MAP[raw.priority as string] ??
            raw.priority) as MaintenancePriority,
        status: (STATUS_MAP[raw.status as string] ??
            raw.status) as MaintenanceStatus,
        reportedDate: (raw.reportedDate as string) ?? "",
        dueDate: (raw.dueDate as string) ?? "",
        assignedTo: (raw.assignedTo as string) ?? "",
        cost: raw.cost as number | undefined,
        notes: (raw.notes as string) ?? "",
    };
}

function fromBackendPage(
    page: SpringPage<Record<string, unknown>>,
): SpringPage<Maintenance> {
    return { ...page, content: page.content.map(fromBackendRow) };
}

function fromBackendSupplier(raw: Record<string, unknown>): Supplier {
    return {
        id: Number(raw.id),
        name: (raw.name ?? raw.supplierName ?? raw.companyName ?? "") as string,
        contactPerson: (raw.contactPerson ?? raw.contact ?? undefined) as
            | string
            | undefined,
    };
}

// ─── Auth helper ──────────────────────────────────────────────────────────────
type GetTokenFn = (opts?: { template?: string }) => Promise<string | null>;

async function getAuthedToken(getToken: GetTokenFn): Promise<string> {
    const token = await getToken({ template: JWT_TEMPLATE });
    if (!token) throw new Error("Not authenticated");
    return token;
}

// ─── Standalone fetchers (React Query compatible) ─────────────────────────────
// These are plain async functions — easy to use in queryFn without hooks.

/** Fetch one page of maintenance tickets — server-side paginated. */
export async function fetchMaintenancePage(
    getToken: GetTokenFn,
    page = 0,
    size = 25,
    search = "",
    status = "",
    priority = "",
): Promise<SpringPage<Maintenance>> {
    const token = await getAuthedToken(getToken);
    const qs = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort: "id,desc",
    });
    if (search.trim()) qs.set("search", search.trim());
    if (status && status !== "All")
        qs.set("status", STATUS_TO_BACKEND[status] ?? status);
    if (priority && priority !== "All") qs.set("priority", priority.toUpperCase());

    const raw = await apiFetch<SpringPage<Record<string, unknown>>>(
        token,
        `/maintenances?${qs}`,
    );
    return fromBackendPage(raw);
}

/** Fetch all assets for combobox — loops pages so nothing is missed. */
export async function fetchAllAssetsForMaintenance(
    getToken: GetTokenFn,
): Promise<Asset[]> {
    const token = await getAuthedToken(getToken);
    let page = 0;
    const size = 500;
    let all: Asset[] = [];

    while (true) {
        const result = await apiFetch<SpringPage<Asset>>(
            token,
            `/assets?page=${page}&size=${size}&sort=id,asc`,
        );
        all = all.concat(result.content);
        if (page + 1 >= result.totalPages) break;
        page++;
    }

    return all;
}

/** Search assets by query string — for search-as-you-type in combobox. */
export async function searchAssetsForMaintenance(
    getToken: GetTokenFn,
    search: string,
    size = 50,
): Promise<Asset[]> {
    const token = await getAuthedToken(getToken);
    const qs = new URLSearchParams({ page: "0", size: String(size) });
    if (search.trim()) qs.set("search", search.trim());
    const result = await apiFetch<SpringPage<Asset>>(token, `/assets?${qs}`);
    return result.content ?? [];
}

/** Fetch all suppliers for combobox — loops pages so nothing is missed. */
export async function fetchAllSuppliers(
    getToken: GetTokenFn,
): Promise<Supplier[]> {
    const token = await getAuthedToken(getToken);
    let page = 0;
    const size = 500;
    let all: Supplier[] = [];

    while (true) {
        const result = await apiFetch<SpringPage<Record<string, unknown>>>(
            token,
            `/suppliers?page=${page}&size=${size}&sort=name,asc`,
        );
        all = all.concat(result.content.map(fromBackendSupplier));
        if (page + 1 >= result.totalPages) break;
        page++;
    }

    return all;
}

// ─── Mutation helpers (plain async — use in useMutation) ─────────────────────
export async function createMaintenance(
    getToken: GetTokenFn,
    dto: MaintenanceFormState,
): Promise<Maintenance> {
    const token = await getAuthedToken(getToken);
    const raw = await apiFetch<Record<string, unknown>>(token, "/maintenances", {
        method: "POST",
        ...reqBody(toBackendDto(dto)),
    });
    return fromBackendRow(raw);
}

export async function updateMaintenance(
    getToken: GetTokenFn,
    id: string,
    dto: MaintenanceFormState,
): Promise<Maintenance> {
    const token = await getAuthedToken(getToken);
    const raw = await apiFetch<Record<string, unknown>>(
        token,
        `/maintenances/${id}`,
        { method: "PUT", ...reqBody(toBackendDto(dto)) },
    );
    return fromBackendRow(raw);
}

export async function deleteMaintenance(
    getToken: GetTokenFn,
    id: string,
): Promise<void> {
    const token = await getAuthedToken(getToken);
    await apiFetch<void>(token, `/maintenances/${id}`, { method: "DELETE" });
}

export async function markMaintenanceCompleted(
    getToken: GetTokenFn,
    id: string,
    existing: Maintenance,
): Promise<Maintenance> {
    const token = await getAuthedToken(getToken);
    const raw = await apiFetch<Record<string, unknown>>(
        token,
        `/maintenances/${id}`,
        {
            method: "PUT",
            ...reqBody(toBackendDto({ ...existing, status: "Completed" })),
        },
    );
    return fromBackendRow(raw);
}

// ─── Hook (kept for backward compatibility) ───────────────────────────────────
export function useMaintenanceApi() {
    const { getToken } = useAuth();

    const withToken = React.useCallback(
        async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
            const token = await getToken({ template: JWT_TEMPLATE });
            if (!token) throw new Error("Not authenticated");
            return fn(token);
        },
        [getToken],
    );

    const getAll = React.useCallback(
        (page = 0, size = 25) =>
            withToken((t) =>
                apiFetch<SpringPage<Record<string, unknown>>>(
                    t,
                    `/maintenances?page=${page}&size=${size}&sort=id,desc`,
                ).then(fromBackendPage),
            ),
        [withToken],
    );

    const create = React.useCallback(
        (dto: MaintenanceFormState) => createMaintenance(getToken, dto),
        [getToken],
    );

    const update = React.useCallback(
        (id: string, dto: MaintenanceFormState) =>
            updateMaintenance(getToken, id, dto),
        [getToken],
    );

    const remove = React.useCallback(
        (id: string) => deleteMaintenance(getToken, id),
        [getToken],
    );

    const markCompleted = React.useCallback(
        (id: string, existing: Maintenance) =>
            markMaintenanceCompleted(getToken, id, existing),
        [getToken],
    );

    const getAssets = React.useCallback(
        () => fetchAllAssetsForMaintenance(getToken).then((content) => ({
            content,
            totalElements: content.length,
            totalPages: 1,
            number: 0,
            size: content.length,
        })),
        [getToken],
    );

    const getSuppliers = React.useCallback(
        () => fetchAllSuppliers(getToken).then((content) => ({
            content,
            totalElements: content.length,
            totalPages: 1,
            number: 0,
            size: content.length,
        })),
        [getToken],
    );

    return {
        getAll,
        create,
        update,
        remove,
        markCompleted,
        getAssets,
        getSuppliers,
    };
}