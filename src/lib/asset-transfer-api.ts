// src/lib/asset-transfer-api.ts
import { clearPersistedAuthSession, useAuth } from "@/lib/auth";
import { parseJsonOrThrow } from "@/lib/http";
import * as React from "react";
import type { Asset, Employee, Location } from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
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

// ─── Shared sub-types ─────────────────────────────────────────────────────────
export type TransferEmployee = {
    id: number;
    empId: string;
    name: string;
};

export type TransferLocation = {
    id: number;
    name: string;
    code?: string;
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
    fromEmployee: TransferEmployee | null;
    toEmployee: TransferEmployee | null;
    fromLocation: TransferLocation | null;
    toLocation: TransferLocation | null;
    createdAt: string;
    updatedAt: string;
};

// ─── Ref wrappers ─────────────────────────────────────────────────────────────
type EmployeeRef = { id: number };
type LocationRef = { id: number };

// ─── Request DTO ──────────────────────────────────────────────────────────────
export type AssetTransferDTO = {
    assetId: { id: number };
    TransferType: "employee" | "location" | "both";
    TransferDate: string;
    reason: string;
    fromEmployeeId: EmployeeRef | null;
    toEmployeeId: EmployeeRef | null;
    fromLocationId: LocationRef | null;
    toLocationId: LocationRef | null;
};

// ─── Auth helper ──────────────────────────────────────────────────────────────
export type GetTokenFn = (params?: { template?: string }) => Promise<string | null>;

export async function withToken<T>(
    getToken: GetTokenFn,
    fn: (token: string) => Promise<T>,
): Promise<T> {
    const token = await getToken({ template: JWT_TEMPLATE });
    if (!token) throw new Error("Not authenticated");
    return fn(token);
}

// ─── Core fetch helper ────────────────────────────────────────────────────────
export async function apiFetch<T>(
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

    if (res.status === 401) {
        clearPersistedAuthSession();
    }

    return parseJsonOrThrow<T>(res);
}

// ─── Fetch all pages helper ───────────────────────────────────────────────────
// Used for lookup comboboxes (employees, locations, assets).
// Uses a large page size to minimise round-trips; loops until all pages loaded.
export async function fetchAllPages<T>(
    getToken: GetTokenFn,
    endpoint: string,   // e.g. "/assets", "/employees", "/locations"
    size = 500,
    extraParams = "",
): Promise<T[]> {
    return withToken(getToken, async (token) => {
        let page = 0;
        let all: T[] = [];

        while (true) {
            const sep = endpoint.includes("?") ? "&" : "?";
            const result = await apiFetch<SpringPage<T>>(
                token,
                `${endpoint}${sep}page=${page}&size=${size}&sort=id,asc${extraParams}`,
            );
            all = all.concat(result.content);
            if (page + 1 >= result.totalPages) break;
            page++;
        }

        return all;
    });
}

// ─── Search helpers (search-as-you-type) ─────────────────────────────────────
// These hit backend search params so we only load what's needed.

export async function searchAssets(
    getToken: GetTokenFn,
    search: string,
    size = 50,
): Promise<Asset[]> {
    return withToken(getToken, async (token) => {
        const qs = new URLSearchParams({
            page: "0",
            size: String(size),
            ...(search.trim() ? { search: search.trim() } : {}),
        });
        const result = await apiFetch<SpringPage<Asset>>(token, `/assets?${qs}`);
        return result.content ?? [];
    });
}

export async function searchEmployees(
    getToken: GetTokenFn,
    search: string,
    size = 50,
): Promise<Employee[]> {
    return withToken(getToken, async (token) => {
        const qs = new URLSearchParams({
            page: "0",
            size: String(size),
            ...(search.trim() ? { search: search.trim() } : {}),
        });
        const result = await apiFetch<SpringPage<Employee>>(
            token,
            `/employees?${qs}`,
        );
        return result.content ?? [];
    });
}

export async function searchLocations(
    getToken: GetTokenFn,
    search: string,
    size = 50,
): Promise<Location[]> {
    return withToken(getToken, async (token) => {
        const qs = new URLSearchParams({
            page: "0",
            size: String(size),
            ...(search.trim() ? { search: search.trim() } : {}),
        });
        const result = await apiFetch<SpringPage<Location>>(
            token,
            `/locations?${qs}`,
        );
        return result.content ?? [];
    });
}

// ─── Transfer CRUD ────────────────────────────────────────────────────────────
export async function fetchAssetTransfers(
    getToken: GetTokenFn,
    page = 0,
    size = 25,
): Promise<SpringPage<AssetTransferResponse>> {
    return withToken(getToken, (token) =>
        apiFetch<SpringPage<AssetTransferResponse>>(
            token,
            `/assetTransfers?page=${page}&size=${size}&sort=id,desc`,
        ),
    );
}

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
                fromEmployeeId: dto.fromEmployeeId,
                toEmployeeId: dto.toEmployeeId,
                fromLocationId: dto.fromLocationId,
                toLocationId: dto.toLocationId,
            }),
        }),
    );
}

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

export async function deleteAssetTransfer(
    getToken: GetTokenFn,
    id: number,
): Promise<void> {
    return withToken(getToken, (token) =>
        apiFetch<void>(token, `/assetTransfers/${id}`, { method: "DELETE" }),
    );
}

// ─── Hook wrapper ─────────────────────────────────────────────────────────────
export function useAssetTransferApi() {
    const { getToken } = useAuth();

    const getAll = React.useCallback(
        (page = 0, size = 25) => fetchAssetTransfers(getToken, page, size),
        [getToken],
    );
    const create = React.useCallback(
        (dto: AssetTransferDTO) => createAssetTransfer(getToken, dto),
        [getToken],
    );
    const update = React.useCallback(
        (id: number, dto: AssetTransferDTO) =>
            updateAssetTransfer(getToken, id, dto),
        [getToken],
    );
    const remove = React.useCallback(
        (id: number) => deleteAssetTransfer(getToken, id),
        [getToken],
    );

    // Lookup helpers exposed from hook for convenience
    const getAllAssets = React.useCallback(
        () => fetchAllPages(getToken, "/assets"),
        [getToken],
    );
    const getAllEmployees = React.useCallback(
        () => fetchAllPages(getToken, "/employees"),
        [getToken],
    );
    const getAllLocations = React.useCallback(
        () => fetchAllPages(getToken, "/locations"),
        [getToken],
    );

    return {
        getAll,
        create,
        update,
        remove,
        getAllAssets,
        getAllEmployees,
        getAllLocations,
    };
}
