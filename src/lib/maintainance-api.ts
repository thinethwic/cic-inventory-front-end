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

// ─── Frontend → Backend DTO ───────────────────────────────────────────────────
// Must match MaintenanceDTO exactly:
// ticketNo, assetId (Long), supplierId (Long), issueTitle, description,
// priority (ENUM), status (ENUM), reportedDate, dueDate, assignedTo, cost, notes
function toBackendDto(
    dto: MaintenanceFormState
): Record<string, unknown> {
    return {
        ticketNo: dto.ticketNo,
        assetId: Number(dto.assetId),
        supplierId: Number(dto.supplierId),       // ✅ Long, not supplier name
        issueTitle: dto.issueTitle,
        description: dto.description || null,
        priority: dto.priority?.toUpperCase(),    // e.g. HIGH
        status: dto.status?.toUpperCase().replace(/\s+/g, "_"), // e.g. IN_PROGRESS
        reportedDate: dto.reportedDate,
        dueDate: dto.dueDate || null,
        assignedTo: dto.assignedTo || null,
        cost: dto.cost ?? null,
        notes: dto.notes || null,
    };
}

// ─── Backend → Frontend ───────────────────────────────────────────────────────
const STATUS_MAP: Record<string, MaintenanceStatus> = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

const PRIORITY_MAP: Record<string, MaintenancePriority> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
};

function fromBackendRow(raw: Record<string, unknown>): Maintenance {
    // Backend returns full asset object due to @ManyToOne
    const asset = raw.asset as Record<string, unknown> | undefined;
    const supplier = raw.supplier as Record<string, unknown> | undefined;

    return {
        id: String(raw.id),
        ticketNo: raw.ticketNo as string,
        assetId: asset?.id != null ? String(asset.id) : String(raw.assetId ?? ""),
        assetCode: (asset?.assetCode as string) ?? "",
        supplierId: supplier?.id != null ? String(supplier.id) : String(raw.supplierId ?? ""),
        supplierName: (supplier?.name as string) ?? "",
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

    const remove = React.useCallback(
        (id: string) =>
            withToken((t) =>
                apiFetch<void>(t, `/maintenances/${id}`, { method: "DELETE" })
            ),
        [withToken]
    );

    const markCompleted = React.useCallback(
        (id: string, existing: Maintenance) =>
            withToken((t) =>
                apiFetch<Record<string, unknown>>(t, `/maintenances/${id}`, {
                    method: "PUT",
                    ...reqBody(
                        toBackendDto({
                            ...existing,
                            status: "Completed",
                        })
                    ),
                }).then(fromBackendRow)
            ),
        [withToken]
    );

    const getAssets = React.useCallback(
        (page = 0, size = 200) =>
            withToken((t) =>
                apiFetch<SpringPage<Asset>>(t, `/assets?page=${page}&size=${size}`)
            ),
        [withToken]
    );

    const getSuppliers = React.useCallback(
        () =>
            withToken((t) =>
                apiFetch<Supplier[] | SpringPage<Supplier>>(t, "/suppliers").then(
                    (res) => (Array.isArray(res) ? res : res.content)
                )
            ),
        [withToken]
    );

    return { getAll, create, update, remove, markCompleted, getAssets, getSuppliers };
}