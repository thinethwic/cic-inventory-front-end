// src/lib/asset-api.ts
import * as React from "react";
import { useAuth } from "@clerk/clerk-react";
import type { Asset, AssetFormState, AssetStatus } from "@/types";

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://cic-inventory-back-end.onrender.com";
const ASSETS_ENDPOINT = `${BASE_URL}/api/v1/assets`;
const LOCATIONS_ENDPOINT = `${BASE_URL}/api/v1/locations`;
const JWT_TEMPLATE = "cic-inventory";

// ─── Spring Boot page wrapper ─────────────────────────────────────────────────
interface SpringPage<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

// ─── Raw response shapes ──────────────────────────────────────────────────────
interface RawLocation {
    id?: number;
    name?: string;
    code?: string;
}

interface RawEmployee {
    id?: number;
    empId?: string;
    name?: string;
}

interface RawAsset {
    id: number;
    assetCode: string;
    barcode?: string | null;
    category: string;
    brand: string;
    model: string;
    serialNo: string;
    status: string;
    location?: string | RawLocation | null;
    assignedTo?: string | RawEmployee | null;
    supplierId?: number | null;
    supplierName?: string | null;
    purchaseDate?: string | null;
    warrantyEnd?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

// ─── Public types ─────────────────────────────────────────────────────────────
export interface FetchAssetsParams {
    page?: number;
    size?: number;
    search?: string;
    status?: string;
    category?: string;
}

export interface AssetsPage {
    content: Asset[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

// ─── Status maps ──────────────────────────────────────────────────────────────
const STATUS_TO_FRONTEND: Record<string, AssetStatus> = {
    AVAILABLE: "Available",
    ASSIGNED: "Assigned",
    MAINTENANCE: "In Repair",
    RETIRED: "Disposed",
    DAMAGED: "Damaged",
};

const STATUS_TO_BACKEND: Record<string, string> = {
    Available: "AVAILABLE",
    Assigned: "ASSIGNED",
    "In Repair": "MAINTENANCE",
    Disposed: "RETIRED",
    Retired: "RETIRED",
    Damaged: "DAMAGED",
};

// ─── Category maps ────────────────────────────────────────────────────────────
const CATEGORY_TO_FRONTEND: Record<string, string> = {
    LAPTOP: "Laptop",
    DESKTOP: "Desktop",
    MONITOR: "Monitor",
    PRINTER: "Printer",
    ROUTER: "Router",
    SWITCH: "Switch",
    OTHER: "Other",
};

const CATEGORY_TO_BACKEND: Record<string, string> = {
    Laptop: "LAPTOP",
    Desktop: "DESKTOP",
    Monitor: "MONITOR",
    Printer: "PRINTER",
    Router: "ROUTER",
    Switch: "SWITCH",
    Other: "OTHER",
};

// ─── Field helpers ────────────────────────────────────────────────────────────
function getLocationName(location?: string | RawLocation | null): string {
    if (!location) return "";
    if (typeof location === "string") return location;
    return location.name ?? "";
}

function getLocationId(location?: string | RawLocation | null): string {
    if (!location || typeof location === "string") return "";
    return location.id != null ? String(location.id) : "";
}

function getAssignedToLabel(assignedTo?: string | RawEmployee | null): string {
    if (!assignedTo) return "";
    if (typeof assignedTo === "string") return assignedTo;
    const empId = assignedTo.empId ?? "";
    const name = assignedTo.name ?? "";
    if (empId && name) return `${empId} - ${name}`;
    return name || empId || "";
}

function getAssignedToId(assignedTo?: string | RawEmployee | null): string {
    if (!assignedTo || typeof assignedTo === "string") return "";
    return assignedTo.id != null ? String(assignedTo.id) : "";
}

// ─── Transformers ─────────────────────────────────────────────────────────────
function toAsset(raw: RawAsset): Asset {
    return {
        id: String(raw.id),
        assetCode: raw.assetCode ?? "",
        barcode: raw.barcode ?? "",
        category: CATEGORY_TO_FRONTEND[raw.category] ?? raw.category,
        brand: raw.brand ?? "",
        model: raw.model ?? "",
        serialNo: raw.serialNo ?? "",
        status: STATUS_TO_FRONTEND[raw.status] ?? (raw.status as AssetStatus),
        location: getLocationName(raw.location),
        assignedTo: getAssignedToLabel(raw.assignedTo),
        locationId: getLocationId(raw.location),
        assignedToId: getAssignedToId(raw.assignedTo),
        supplierId: raw.supplierId ?? undefined,
        supplierName: raw.supplierName ?? undefined,
        purchaseDate: raw.purchaseDate ?? "",
        warrantyEnd: raw.warrantyEnd ?? "",
    };
}

function toRequestBody(form: AssetFormState) {
    return {
        assetCode: form.assetCode.trim(),
        barcode: form.barcode?.trim() || null,
        category: CATEGORY_TO_BACKEND[form.category] ?? form.category,
        brand: form.brand.trim(),
        model: form.model.trim(),
        serialNo: form.serialNo.trim(),
        status: STATUS_TO_BACKEND[form.status] ?? form.status,
        locationId: Number(form.locationId),
        assignedToId: form.assignedToId?.trim() ? Number(form.assignedToId) : null,
        supplierId: form.supplierId?.trim() ? Number(form.supplierId) : null,
        purchaseDate: form.purchaseDate || null,
        warrantyEnd: form.warrantyEnd || null,
    };
}

// ─── Query-string builder ─────────────────────────────────────────────────────
function buildPageParams(params: FetchAssetsParams): URLSearchParams {
    const { page = 0, size = 25, search, status, category } = params;
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("size", String(size));
    if (search?.trim()) qs.set("search", search.trim());
    if (status && status !== "All") qs.set("status", STATUS_TO_BACKEND[status] ?? status);
    if (category && category !== "All") qs.set("category", CATEGORY_TO_BACKEND[category] ?? category);
    return qs;
}

// ─── Response helper ──────────────────────────────────────────────────────────
async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        let message = `Request failed with status ${res.status}`;
        if (text) {
            try {
                const json = JSON.parse(text);
                message = json.message ?? json.error ?? text;
            } catch {
                message = text;
            }
        }
        throw new Error(message);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export type GetTokenFn = (opts?: { template?: string }) => Promise<string | null>;

const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
};

async function authFetch(
    getToken: GetTokenFn,
    url: string,
    init: RequestInit = {},
    template = JWT_TEMPLATE,
) {
    const token = await getToken({ template });
    if (!token) throw new Error("No auth token (user not signed in)");
    return fetch(url, {
        ...init,
        headers: {
            ...defaultHeaders,
            ...(init.headers ?? {}),
            Authorization: `Bearer ${token}`,
        },
    });
}

// ─── Resolve locationId ───────────────────────────────────────────────────────
// Backend sometimes returns location as { id, name } and sometimes as a plain
// string. This helper handles both cases — if it's a string it does a lookup.
async function resolveLocationId(
    location: string | RawLocation | null | undefined,
    token: string,
): Promise<number | null> {
    if (!location) return null;

    // Best case — backend returned location as an object with id
    if (typeof location === "object" && location.id != null) {
        return location.id;
    }

    // Fallback — location is a plain string name, resolve via locations endpoint
    if (typeof location === "string" && location.trim()) {
        const res = await fetch(`${LOCATIONS_ENDPOINT}?size=500`, {
            headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;

        const data = await res.json().catch(() => null);
        const locations: Array<{ id: number; name: string }> =
            data?.content ?? data ?? [];

        const match = locations.find(
            (l) => l.name?.trim().toLowerCase() === location.trim().toLowerCase(),
        );
        return match?.id ?? null;
    }

    return null;
}

// ─── Resolve assignedToId ─────────────────────────────────────────────────────
function resolveAssignedToId(
    assignedTo: string | RawEmployee | null | undefined,
): number | null {
    if (!assignedTo) return null;
    if (typeof assignedTo === "object" && assignedTo.id != null) {
        return assignedTo.id;
    }
    return null;
}

// ─── Standalone exports (backward compatible) ─────────────────────────────────
/** @deprecated Use the useAssetApi hook instead. */
export async function fetchAssets(getToken: GetTokenFn): Promise<Asset[]> {
    const res = await authFetch(getToken, `${ASSETS_ENDPOINT}?size=1000`);
    const data = await handleResponse<SpringPage<RawAsset> | RawAsset[]>(res);
    if (Array.isArray(data)) return data.map(toAsset);
    return (data.content ?? []).map(toAsset);
}

/** @deprecated Use the useAssetApi hook instead. */
export async function fetchAssetsPage(
    getToken: GetTokenFn,
    params: FetchAssetsParams = {},
): Promise<AssetsPage> {
    const qs = buildPageParams(params);
    const res = await authFetch(getToken, `${ASSETS_ENDPOINT}?${qs.toString()}`);
    const data = await handleResponse<SpringPage<RawAsset>>(res);
    return {
        content: (data.content ?? []).map(toAsset),
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 1,
        number: data.number ?? 0,
        size: data.size ?? (params.size ?? 25),
    };
}

/** @deprecated Use the useAssetApi hook instead. */
export async function fetchAssetByScan(
    getToken: GetTokenFn,
    code: string,
): Promise<Asset> {
    const res = await authFetch(
        getToken,
        `${ASSETS_ENDPOINT}/scan/${encodeURIComponent(code)}`,
    );
    const raw = await handleResponse<RawAsset>(res);
    return toAsset(raw);
}

/** @deprecated Use the useAssetApi hook instead. */
export async function createAsset(
    getToken: GetTokenFn,
    data: AssetFormState,
): Promise<Asset> {
    const res = await authFetch(getToken, ASSETS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(toRequestBody(data)),
    });
    const raw = await handleResponse<RawAsset>(res);
    return toAsset(raw);
}

/** @deprecated Use the useAssetApi hook instead. */
export async function updateAsset(
    getToken: GetTokenFn,
    id: string,
    data: AssetFormState,
): Promise<Asset> {
    const res = await authFetch(getToken, `${ASSETS_ENDPOINT}/${id}`, {
        method: "PUT",
        body: JSON.stringify(toRequestBody(data)),
    });
    const raw = await handleResponse<RawAsset>(res);
    return toAsset(raw);
}

/** @deprecated Use the useAssetApi hook instead. */
export async function deleteAsset(
    getToken: GetTokenFn,
    id: string,
): Promise<void> {
    const res = await authFetch(getToken, `${ASSETS_ENDPOINT}/${id}`, {
        method: "DELETE",
    });
    await handleResponse<void>(res);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAssetApi() {
    const { getToken } = useAuth();

    const getTokenRef = React.useRef(getToken);
    React.useLayoutEffect(() => {
        getTokenRef.current = getToken;
    });

    const withToken = React.useCallback(
        async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
            const token = await getTokenRef.current({ template: JWT_TEMPLATE });
            if (!token) throw new Error("Not authenticated");
            return fn(token);
        },
        [],
    );

    const getPage = React.useCallback(
        (params: FetchAssetsParams = {}) =>
            withToken(async (token) => {
                const qs = buildPageParams(params);
                const res = await fetch(`${ASSETS_ENDPOINT}?${qs.toString()}`, {
                    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
                });
                const data = await handleResponse<SpringPage<RawAsset>>(res);
                return {
                    content: (data.content ?? []).map(toAsset),
                    totalElements: data.totalElements ?? 0,
                    totalPages: data.totalPages ?? 1,
                    number: data.number ?? 0,
                    size: data.size ?? (params.size ?? 25),
                } satisfies AssetsPage;
            }),
        [withToken],
    );

    const getByScan = React.useCallback(
        (code: string) =>
            withToken(async (token) => {
                const res = await fetch(
                    `${ASSETS_ENDPOINT}/scan/${encodeURIComponent(code)}`,
                    { headers: { ...defaultHeaders, Authorization: `Bearer ${token}` } },
                );
                const raw = await handleResponse<RawAsset>(res);
                return toAsset(raw);
            }),
        [withToken],
    );

    const create = React.useCallback(
        (form: AssetFormState) =>
            withToken(async (token) => {
                const res = await fetch(ASSETS_ENDPOINT, {
                    method: "POST",
                    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
                    body: JSON.stringify(toRequestBody(form)),
                });
                const raw = await handleResponse<RawAsset>(res);
                return toAsset(raw);
            }),
        [withToken],
    );

    const update = React.useCallback(
        (id: string, form: AssetFormState) =>
            withToken(async (token) => {
                const res = await fetch(`${ASSETS_ENDPOINT}/${id}`, {
                    method: "PUT",
                    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
                    body: JSON.stringify(toRequestBody(form)),
                });
                const raw = await handleResponse<RawAsset>(res);
                return toAsset(raw);
            }),
        [withToken],
    );

    const updateStatus = React.useCallback(
        (id: string, status: AssetStatus) =>
            withToken(async (token) => {
                // Step 1: GET the current asset in raw backend format
                const getRes = await fetch(`${ASSETS_ENDPOINT}/${id}`, {
                    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
                });
                const raw = await handleResponse<RawAsset>(getRes);

                // Step 2: Resolve locationId — handles both object and string shapes
                // If backend returns location as a plain string, we look it up by name
                const locationId = await resolveLocationId(raw.location, token);

                // Step 3: Resolve assignedToId — only works if backend returns object
                const assignedToId = resolveAssignedToId(raw.assignedTo);

                // Step 4: Build PUT body directly from raw fields
                // IMPORTANT: raw.category and raw.status are already in backend
                // format (e.g. "LAPTOP", "AVAILABLE") — do NOT pass through
                // toRequestBody() which would double-transform them
                const body = {
                    assetCode: raw.assetCode,
                    barcode: raw.barcode ?? null,
                    category: raw.category,                        // already "LAPTOP"
                    brand: raw.brand,
                    model: raw.model,
                    serialNo: raw.serialNo,
                    status: STATUS_TO_BACKEND[status] ?? status, // only this changes
                    locationId,
                    assignedToId,
                    supplierId: raw.supplierId ?? null,
                    purchaseDate: raw.purchaseDate ?? null,
                    warrantyEnd: raw.warrantyEnd ?? null,
                };

                // Step 5: PUT with clean payload
                const putRes = await fetch(`${ASSETS_ENDPOINT}/${id}`, {
                    method: "PUT",
                    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
                    body: JSON.stringify(body),
                });
                const updated = await handleResponse<RawAsset>(putRes);
                return toAsset(updated);
            }),
        [withToken],
    );

    /** @deprecated Use getPage instead. */
    const getAll = React.useCallback(
        (page = 0, size = 1000) =>
            withToken(async (token) => {
                const res = await fetch(
                    `${ASSETS_ENDPOINT}?page=${page}&size=${size}`,
                    { headers: { ...defaultHeaders, Authorization: `Bearer ${token}` } },
                );
                const data = await handleResponse<SpringPage<RawAsset> | RawAsset[]>(res);
                return Array.isArray(data)
                    ? data.map(toAsset)
                    : (data.content ?? []).map(toAsset);
            }),
        [withToken],
    );

    const remove = React.useCallback(
        (id: string) =>
            withToken(async (token) => {
                const res = await fetch(`${ASSETS_ENDPOINT}/${id}`, {
                    method: "DELETE",
                    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
                });
                await handleResponse<void>(res);
            }),
        [withToken],
    );

    return { getPage, getAll, getByScan, create, update, updateStatus, remove };
}