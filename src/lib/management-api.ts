// src/lib/management-api.ts
import * as React from "react";
import { useAuth } from "@clerk/clerk-react";
import type { Department, Location, Supplier, Employee } from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const API_BASE = `${BASE_URL}/api/v1`;
const JWT_TEMPLATE = "cic-inventory";

type SpringPage<T> = {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
};

export type EmployeePayload = {
    empId: string;
    name: string;
    department: { id: number };
    location: { id: number };
    phone_no: string;
    email: string;
    employeeStatus: "ACTIVE" | "INACTIVE";
};

export type DepartmentPayload = {
    name: string;
    code: string;
    location: { id: number }; // ← FK reference to Location
};
export type LocationPayload = { name: string; code: string };
export type SupplierPayload = { name: string; phone_no?: string; email?: string };

async function apiFetch<T>(
    token: string,
    endpoint: string,
    init: RequestInit = {},
): Promise<T> {
    const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const res = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(init.headers ?? {}),
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const msg = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(msg || `Request failed: ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

function unwrap<T>(res: T[] | SpringPage<T>): T[] {
    if (Array.isArray(res)) return res;
    return Array.isArray(res?.content) ? res.content : [];
}

function body(payload: unknown): RequestInit {
    return { body: JSON.stringify(payload) };
}

// All list endpoints get ?page=0&size=9999 to fetch every record,
// bypassing the Spring default page size of 20.
const ALL = "?page=0&size=9999";

export function useManagementApi() {
    const { getToken } = useAuth();

    const getAuthToken = React.useCallback(
        () => getToken({ template: JWT_TEMPLATE }),
        [getToken],
    );

    const withToken = React.useCallback(
        async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");
            return fn(token);
        },
        [getAuthToken],
    );

    // Full load for Employees page
    const loadAll = React.useCallback(async (): Promise<{
        employees: Employee[];
        departments: Department[];
        locations: Location[];
        suppliers: Supplier[];
    }> => {
        const token = await getAuthToken();
        if (!token) throw new Error("Not authenticated");

        const [employees, departments, locations, suppliers] = await Promise.all([
            apiFetch<Employee[] | SpringPage<Employee>>(token, `/employees${ALL}`).then(unwrap),
            apiFetch<Department[] | SpringPage<Department>>(token, `/departments${ALL}`).then(unwrap),
            apiFetch<Location[] | SpringPage<Location>>(token, `/locations${ALL}`).then(unwrap),
            apiFetch<Supplier[] | SpringPage<Supplier>>(token, `/suppliers${ALL}`).then(unwrap),
        ]);

        return { employees, departments, locations, suppliers };
    }, [getAuthToken]);

    // Lightweight load for Assets page — includes suppliers for the dropdown
    const loadAssetLookups = React.useCallback(async (): Promise<{
        employees: Employee[];
        locations: Location[];
        suppliers: Supplier[];
    }> => {
        const token = await getAuthToken();
        if (!token) throw new Error("Not authenticated");

        const [employees, locations, suppliers] = await Promise.all([
            apiFetch<Employee[] | SpringPage<Employee>>(token, `/employees${ALL}`).then(unwrap),
            apiFetch<Location[] | SpringPage<Location>>(token, `/locations${ALL}`).then(unwrap),
            apiFetch<Supplier[] | SpringPage<Supplier>>(token, `/suppliers${ALL}`).then(unwrap),
        ]);

        return { employees, locations, suppliers };
    }, [getAuthToken]);

    const createEmployee = React.useCallback(
        (payload: EmployeePayload) =>
            withToken((t) =>
                apiFetch<Employee>(t, "/employees", { method: "POST", ...body(payload) }),
            ),
        [withToken],
    );

    const updateEmployee = React.useCallback(
        (id: number, payload: EmployeePayload) =>
            withToken((t) =>
                apiFetch<Employee>(t, `/employees/${id}`, { method: "PUT", ...body(payload) }),
            ),
        [withToken],
    );

    const deleteEmployee = React.useCallback(
        (id: number) =>
            withToken((t) => apiFetch<void>(t, `/employees/${id}`, { method: "DELETE" })),
        [withToken],
    );

    const createSupplier = React.useCallback(
        (payload: SupplierPayload) =>
            withToken((t) =>
                apiFetch<Supplier>(t, "/suppliers", { method: "POST", ...body(payload) }),
            ),
        [withToken],
    );

    const updateSupplier = React.useCallback(
        (id: number, payload: SupplierPayload) =>
            withToken((t) =>
                apiFetch<Supplier>(t, `/suppliers/${id}`, { method: "PUT", ...body(payload) }),
            ),
        [withToken],
    );

    const deleteSupplier = React.useCallback(
        (id: number) =>
            withToken((t) => apiFetch<void>(t, `/suppliers/${id}`, { method: "DELETE" })),
        [withToken],
    );

    const createDepartment = React.useCallback(
        (payload: DepartmentPayload) =>
            withToken((t) =>
                apiFetch<Department>(t, "/departments", { method: "POST", ...body(payload) }),
            ),
        [withToken],
    );

    const updateDepartment = React.useCallback(
        (id: number, payload: DepartmentPayload) =>
            withToken((t) =>
                apiFetch<Department>(t, `/departments/${id}`, { method: "PUT", ...body(payload) }),
            ),
        [withToken],
    );

    const deleteDepartment = React.useCallback(
        (id: number) =>
            withToken((t) => apiFetch<void>(t, `/departments/${id}`, { method: "DELETE" })),
        [withToken],
    );

    const createLocation = React.useCallback(
        (payload: LocationPayload) =>
            withToken((t) =>
                apiFetch<Location>(t, "/locations", { method: "POST", ...body(payload) }),
            ),
        [withToken],
    );

    const updateLocation = React.useCallback(
        (id: number, payload: LocationPayload) =>
            withToken((t) =>
                apiFetch<Location>(t, `/locations/${id}`, { method: "PUT", ...body(payload) }),
            ),
        [withToken],
    );

    const deleteLocation = React.useCallback(
        (id: number) =>
            withToken((t) => apiFetch<void>(t, `/locations/${id}`, { method: "DELETE" })),
        [withToken],
    );

    return {
        loadAll,
        loadAssetLookups,
        createEmployee,
        updateEmployee,
        deleteEmployee,
        createSupplier,
        updateSupplier,
        deleteSupplier,
        createDepartment,
        updateDepartment,
        deleteDepartment,
        createLocation,
        updateLocation,
        deleteLocation,
    };
}