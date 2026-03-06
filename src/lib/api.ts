// src/lib/api.ts
import type { Asset, AssetFormState, AssetStatus } from "@/types";

// ─── Base config ──────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const ASSETS_ENDPOINT = `${BASE_URL}/api/v1/assets`;

// ─── Spring Boot page wrapper ─────────────────────────────────────────────────
interface SpringPage<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

// ─── Raw response shape from backend ──────────────────────────────────────────
interface RawLocation {
    id?: number;
    name?: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLocationName(location?: string | RawLocation | null): string {
    if (!location) return "";
    if (typeof location === "string") return location;
    return location.name ?? "";
}

function getAssignedToLabel(assignedTo?: string | RawEmployee | null): string {
    if (!assignedTo) return "";
    if (typeof assignedTo === "string") return assignedTo;

    const empId = assignedTo.empId ?? "";
    const name = assignedTo.name ?? "";

    if (empId && name) return `${empId} - ${name}`;
    return name || empId || "";
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
        // ✅ Send flat IDs — matches the updated AssetDTO (locationId / assignedToId)
        locationId: Number(form.locationId),
        assignedToId: form.assignedToId?.trim()
            ? Number(form.assignedToId)
            : null,
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

// ─── Clerk auth integration ───────────────────────────────────────────────────
export type GetTokenFn = (opts?: { template?: string }) => Promise<string | null>;

const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
};

async function authFetch(
    getToken: GetTokenFn,
    url: string,
    init: RequestInit = {},
    template = "cic-inventory",
) {
    const token = await getToken({ template });
    console.log(token)
    if (!token) throw new Error("No auth token (user not signed in)");

    const headers = {
        ...defaultHeaders,
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
    };

    return fetch(url, { ...init, headers });
}

// ─── API functions ────────────────────────────────────────────────────────────
export async function fetchAssets(getToken: GetTokenFn): Promise<Asset[]> {
    const res = await authFetch(getToken, `${ASSETS_ENDPOINT}?page=0&size=200`, {
        method: "GET",
    });

    const data = await handleResponse<SpringPage<RawAsset> | RawAsset[]>(res);

    if (Array.isArray(data)) {
        return data.map(toAsset);
    }

    return Array.isArray(data.content) ? data.content.map(toAsset) : [];
}

export async function fetchAssetById(
    getToken: GetTokenFn,
    id: string,
): Promise<Asset> {
    const res = await authFetch(getToken, `${ASSETS_ENDPOINT}/${id}`, {
        method: "GET",
    });

    const raw = await handleResponse<RawAsset>(res);
    return toAsset(raw);
}

export async function fetchAssetByScan(
    getToken: GetTokenFn,
    code: string,
): Promise<Asset> {
    const res = await authFetch(
        getToken,
        `${ASSETS_ENDPOINT}/scan?q=${encodeURIComponent(code)}`,
        { method: "GET" },
    );

    const raw = await handleResponse<RawAsset>(res);
    return toAsset(raw);
}

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

export async function deleteAsset(
    getToken: GetTokenFn,
    id: string,
): Promise<void> {
    const res = await authFetch(getToken, `${ASSETS_ENDPOINT}/${id}`, {
        method: "DELETE",
    });

    return handleResponse<void>(res);
}