// src/lib/asset-transfer-api.ts
import { useAuth } from "@clerk/clerk-react";
import * as React from "react";

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

// ─── Response shape ───────────────────────────────────────────────────────────
export type AssetTransferResponse = {
    id: number;
    TransferType: string;
    TransferDate: string;
    reason: string | null;
    asset: {
        id: number;
        assetCode: string;
        brand: string;
        model: string;
        category: string;
        serialNo: string;
        barcode?: string;
        status: string;
        assignedTo?: string;
        assignedToId?: string;
        location?: string;
        locationId?: string;
    };
    createdAt: string;
    updatedAt: string;
};

// ─── Request DTO ──────────────────────────────────────────────────────────────
// Field names must match backend AssetTransferDTO exactly.
// Lombok @Data on the backend generates getters from the literal field name:
//   private String TransferType  →  getTransferType()
//   private LocalDate TransferDate → getTransferDate()
// Jackson therefore expects JSON keys "TransferType" and "TransferDate" (capital T).
// assetId is typed as Asset entity — { id: number } maps to Asset.id.
// reason is @NotNull — always send a non-null string.
export type AssetTransferDTO = {
    assetId: { id: number };
    TransferType: "employee" | "location" | "both";   // capital T — matches backend field
    TransferDate: string;                              // capital T — "YYYY-MM-DD"
    reason: string;                                    // @NotNull — never undefined/null
};

// ─── Auth helper ──────────────────────────────────────────────────────────────
type GetTokenFn = (params?: { template?: string }) => Promise<string | null>;

async function withToken<T>(
    getToken: GetTokenFn,
    fn: (token: string) => Promise<T>,
): Promise<T> {
    const token = await getToken({ template: JWT_TEMPLATE });
    if (!token) throw new Error("Not authenticated");
    return fn(token);
}

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
                Authorization: `Bearer ${token}`,
                ...(init.headers ?? {}),
            },
        });
    } catch (err) {
        throw new Error(`Network error: ${String(err)}`);
    }

    if (res.status === 204) return undefined as T;

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
        if (isJson) {
            const body = await res.json().catch(() => ({}));
            // Log full Spring error so we can see the real cause
            console.error("[apiFetch] Error body:", JSON.stringify(body, null, 2));
            const msg = body?.message ?? body?.error ?? `HTTP ${res.status}`;
            throw new Error(msg);
        }
        const text = await res.text().catch(() => "");
        console.error("[apiFetch] Non-JSON error:", text);
        throw new Error(`API ${res.status}: ${text || "Non-JSON response"}`);
    }

    if (!isJson) {
        throw new Error(`Expected JSON but received ${contentType}`);
    }

    return res.json() as Promise<T>;
}

// ─── Fetch all transfers — sorted newest first ────────────────────────────────
export async function fetchAssetTransfers(
    getToken: GetTokenFn,
    page = 0,
    size = 20,
): Promise<SpringPage<AssetTransferResponse>> {
    return withToken(getToken, (token) =>
        apiFetch<SpringPage<AssetTransferResponse>>(
            token,
            `/assetTransfers?page=${page}&size=${size}&sort=id,desc`,
        ),
    );
}

// ─── Create transfer ──────────────────────────────────────────────────────────
// JSON keys match backend AssetTransferDTO field names exactly:
//   assetId      → Asset entity   { id: number }
//   TransferType → String         capital T
//   TransferDate → LocalDate      capital T, "YYYY-MM-DD"
//   reason       → String         @NotNull, fallback to "N/A" if empty
export async function createAssetTransfer(
    getToken: GetTokenFn,
    dto: AssetTransferDTO,
): Promise<AssetTransferResponse> {
    return withToken(getToken, (token) =>
        apiFetch<AssetTransferResponse>(token, "/assetTransfers", {
            method: "POST",
            body: JSON.stringify({
                assetId: dto.assetId,
                TransferType: dto.TransferType,
                TransferDate: dto.TransferDate,
                reason: dto.reason.trim() || "N/A",
            }),
        }),
    );
}

// ─── Update transfer ──────────────────────────────────────────────────────────
export async function updateAssetTransfer(
    getToken: GetTokenFn,
    id: number,
    dto: AssetTransferDTO,
): Promise<AssetTransferResponse> {
    return withToken(getToken, (token) =>
        apiFetch<AssetTransferResponse>(token, `/assetTransfers/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                assetId: dto.assetId,
                TransferType: dto.TransferType,
                TransferDate: dto.TransferDate,
                reason: dto.reason.trim() || "N/A",
            }),
        }),
    );
}

// ─── Delete transfer ──────────────────────────────────────────────────────────
export async function deleteAssetTransfer(
    getToken: GetTokenFn,
    id: number,
): Promise<void> {
    return withToken(getToken, (token) =>
        apiFetch<void>(token, `/assetTransfers/${id}`, {
            method: "DELETE",
        }),
    );
}

// ─── Hook wrapper ─────────────────────────────────────────────────────────────
export function useAssetTransferApi() {
    const { getToken } = useAuth();

    const getAll = React.useCallback(
        (page = 0, size = 20) =>
            fetchAssetTransfers(getToken, page, size),
        [getToken],
    );

    const create = React.useCallback(
        (dto: AssetTransferDTO) =>
            createAssetTransfer(getToken, dto),
        [getToken],
    );

    const update = React.useCallback(
        (id: number, dto: AssetTransferDTO) =>
            updateAssetTransfer(getToken, id, dto),
        [getToken],
    );

    const remove = React.useCallback(
        (id: number) =>
            deleteAssetTransfer(getToken, id),
        [getToken],
    );

    return { getAll, create, update, remove };
}