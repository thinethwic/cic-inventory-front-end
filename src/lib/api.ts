// src/lib/asset-api.ts
import * as React from "react";
import { useAuth } from "@clerk/clerk-react";
import type { Asset, AssetFormState, AssetStatus } from "@/types";

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const ASSETS_ENDPOINT = `${BASE_URL}/api/v1/assets`;
const JWT_TEMPLATE = "cic-inventory";

// ─── Spring Boot page wrapper ─────────────────────────────────────────────────
interface SpringPage<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

// ─── Raw response shapes from backend ────────────────────────────────────────
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
    purchaseDate?: string | null;
    warrantyEnd?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

// ─── Status maps ──────────────────────────────────────────────────────────────
const STATUS_TO_FRONTEND: Record<string, AssetStatus> = {
    AVAILABLE: "Available",
    ASSIGNED: "Assigned",
    MAINTENANCE: "In Repair",
    RETIRED: "Disposed",
};

const STATUS_TO_BACKEND: Record<string, string> = {
    Available: "AVAILABLE",
    Assigned: "ASSIGNED",
    "In Repair": "MAINTENANCE",
    Disposed: "RETIRED",
    Retired: "RETIRED",
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
        purchaseDate: form.purchaseDate || null,
        warrantyEnd: form.warrantyEnd || null,
    };
}

// ─── Response helper ──────────────────────────────────────────────────────────
async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const message = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(message || `Request failed with status ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

// ─── Clerk auth ───────────────────────────────────────────────────────────────
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

// ─── Existing plain functions (kept for backward compatibility) ───────────────
export async function fetchAssets(getToken: GetTokenFn): Promise<Asset[]> {
    const res = await authFetch(getToken, `${ASSETS_ENDPOINT}?size=1000`);
    const data = await handleResponse<SpringPage<RawAsset> | RawAsset[]>(res);
    if (Array.isArray(data)) return data.map(toAsset);
    return (data.content ?? []).map(toAsset);
}

export async function fetchAssetByScan(getToken: GetTokenFn, code: string): Promise<Asset> {
    const res = await authFetch(getToken, `${ASSETS_ENDPOINT}/scan/${encodeURIComponent(code)}`);
    const raw = await handleResponse<RawAsset>(res);
    return toAsset(raw);
}

export async function createAsset(getToken: GetTokenFn, data: AssetFormState): Promise<Asset> {
    const res = await authFetch(getToken, ASSETS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(toRequestBody(data)),
    });
    const raw = await handleResponse<RawAsset>(res);
    return toAsset(raw);
}

export async function updateAsset(getToken: GetTokenFn, id: string, data: AssetFormState): Promise<Asset> {
    const res = await authFetch(getToken, `${ASSETS_ENDPOINT}/${id}`, {
        method: "PUT",
        body: JSON.stringify(toRequestBody(data)),
    });
    const raw = await handleResponse<RawAsset>(res);
    return toAsset(raw);
}

export async function deleteAsset(getToken: GetTokenFn, id: string): Promise<void> {
    const res = await authFetch(getToken, `${ASSETS_ENDPOINT}/${id}`, { method: "DELETE" });
    await handleResponse<void>(res);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAssetApi() {
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
        (page = 0, size = 1000) =>
            withToken(async (token) => {
                const res = await fetch(`${ASSETS_ENDPOINT}?page=${page}&size=${size}`, {
                    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
                });
                const data = await handleResponse<SpringPage<RawAsset> | RawAsset[]>(res);
                return Array.isArray(data) ? data.map(toAsset) : (data.content ?? []).map(toAsset);
            }),
        [withToken],
    );

    const getByScan = React.useCallback(
        (code: string) =>
            withToken(async (token) => {
                const res = await fetch(`${ASSETS_ENDPOINT}/scan/${encodeURIComponent(code)}`, {
                    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
                });
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

    // ✅ NEW: updateStatus — fetches current asset then patches only the status
    const updateStatus = React.useCallback(
        (id: string, status: AssetStatus) =>
            withToken(async (token) => {
                // Step 1: fetch current asset to preserve all existing fields
                const getRes = await fetch(`${ASSETS_ENDPOINT}/${id}`, {
                    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
                });
                const raw = await handleResponse<RawAsset>(getRes);
                const current = toAsset(raw);

                // Step 2: build full AssetFormState with only status changed
                const form: AssetFormState = {
                    assetCode: current.assetCode,
                    barcode: current.barcode ?? "",
                    category: current.category,
                    brand: current.brand,
                    model: current.model,
                    serialNo: current.serialNo,
                    status,                        // ✅ only this field changes
                    locationId: current.locationId,
                    assignedToId: current.assignedToId ?? "",
                    purchaseDate: current.purchaseDate ?? "",
                    warrantyEnd: current.warrantyEnd ?? "",
                };

                // Step 3: PUT the full object back
                const putRes = await fetch(`${ASSETS_ENDPOINT}/${id}`, {
                    method: "PUT",
                    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
                    body: JSON.stringify(toRequestBody(form)),
                });
                const updated = await handleResponse<RawAsset>(putRes);
                return toAsset(updated);
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

    return { getAll, getByScan, create, update, updateStatus, remove };
}