// src/api.ts
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

// ─── Raw shape from Spring Boot ───────────────────────────────────────────────
interface RawAsset {
    id: number;
    assetCode: string;
    barcode?: string | null;
    category: string;   // "LAPTOP" | "DESKTOP" | "MONITOR" | "PRINTER" | "ROUTER" | "SWITCH" | "OTHER"
    brand: string;
    model: string;
    serialNo: string;
    status: string;     // "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "RETIRED"
    location: string;
    assignedTo?: string | null;
    purchaseDate?: string | null;
    warrantyEnd?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

// ─── Status maps ──────────────────────────────────────────────────────────────
// AssetStatus enum in backend:  AVAILABLE | ASSIGNED | MAINTENANCE | RETIRED
const STATUS_TO_FRONTEND: Record<string, AssetStatus> = {
    AVAILABLE: "Available",
    ASSIGNED: "Assigned",
    MAINTENANCE: "In Repair",   // maps to your existing "In Repair" UI label
    RETIRED: "Disposed",    // maps to your existing "Disposed" UI label
};

const STATUS_TO_BACKEND: Record<string, string> = {
    Available: "AVAILABLE",
    Assigned: "ASSIGNED",
    "In Repair": "MAINTENANCE",
    Disposed: "RETIRED",
};

// ─── Category maps ────────────────────────────────────────────────────────────
// AssetCategory enum in backend: LAPTOP | DESKTOP | MONITOR | PRINTER | ROUTER | SWITCH | OTHER
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

// ─── Transformers ─────────────────────────────────────────────────────────────
function toAsset(raw: RawAsset): Asset {
    return {
        ...raw,
        id: String(raw.id),
        status: STATUS_TO_FRONTEND[raw.status] ?? (raw.status as AssetStatus),
        category: CATEGORY_TO_FRONTEND[raw.category] ?? raw.category,
        barcode: raw.barcode ?? "",
        assignedTo: raw.assignedTo ?? "",
        purchaseDate: raw.purchaseDate ?? "",
        warrantyEnd: raw.warrantyEnd ?? "",
    };
}

function toRequestBody(form: AssetFormState) {
    return {
        ...form,
        status: STATUS_TO_BACKEND[form.status] ?? form.status,
        category: CATEGORY_TO_BACKEND[form.category] ?? form.category,
        barcode: form.barcode || null,
        assignedTo: form.assignedTo || null,
        purchaseDate: form.purchaseDate || null,
        warrantyEnd: form.warrantyEnd || null,
    };
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const message = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(message || `Request failed with status ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
};

export async function fetchAssets(): Promise<Asset[]> {
    const res = await fetch(`${ASSETS_ENDPOINT}?page=0&size=200`, {
        method: "GET",
        headers: defaultHeaders,
    });
    const page = await handleResponse<SpringPage<RawAsset>>(res);
    return page.content.map(toAsset);
}

export async function fetchAssetById(id: string): Promise<Asset> {
    const res = await fetch(`${ASSETS_ENDPOINT}/${id}`, {
        method: "GET",
        headers: defaultHeaders,
    });
    const raw = await handleResponse<RawAsset>(res);
    return toAsset(raw);
}

/** GET /api/assets/scan?q={code}  →  Asset (by barcode / serial / assetCode) */
export async function fetchAssetByScan(code: string): Promise<Asset> {
    const res = await fetch(
        `${ASSETS_ENDPOINT}/scan?q=${encodeURIComponent(code)}`,
        { method: "GET", headers: defaultHeaders },
    );
    const raw = await handleResponse<RawAsset>(res);
    return toAsset(raw);
}

/** POST /api/assets  →  Asset */
export async function createAsset(data: AssetFormState): Promise<Asset> {
    const res = await fetch(ASSETS_ENDPOINT, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(toRequestBody(data)),
    });
    const raw = await handleResponse<RawAsset>(res);
    return toAsset(raw);
}

/** PUT /api/assets/{id}  →  Asset */
export async function updateAsset(id: string, data: AssetFormState): Promise<Asset> {
    const res = await fetch(`${ASSETS_ENDPOINT}/${id}`, {
        method: "PUT",
        headers: defaultHeaders,
        body: JSON.stringify(toRequestBody(data)),
    });
    const raw = await handleResponse<RawAsset>(res);
    return toAsset(raw);
}

/** DELETE /api/assets/{id}  →  void */
export async function deleteAsset(id: string): Promise<void> {
    const res = await fetch(`${ASSETS_ENDPOINT}/${id}`, {
        method: "DELETE",
        headers: defaultHeaders,
    });
    return handleResponse<void>(res);
}