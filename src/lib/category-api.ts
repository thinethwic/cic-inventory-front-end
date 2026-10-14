// src/lib/category-api.ts
import * as React from "react";
import { useAuth } from "@/lib/auth";
import {
    apiFetch,
    unwrap,
    body,
    ALL,
    JWT_TEMPLATE,
    type SpringPage,
} from "@/lib/management-api";

// Move this to "@/types" if you keep your other types there.
export type Category = {
    id: number;
    name: string;
    createdAt: string;
    updatedAt: string | null;
};

export type CategoryPayload = { name: string };

export function useCategoryApi() {
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

    const loadCategories = React.useCallback(
        () =>
            withToken((t) =>
                apiFetch<Category[] | SpringPage<Category>>(t, `/categories${ALL}`).then(unwrap),
            ),
        [withToken],
    );

    const getCategory = React.useCallback(
        (id: number) =>
            withToken((t) => apiFetch<Category>(t, `/categories/${id}`)),
        [withToken],
    );

    const createCategory = React.useCallback(
        (payload: CategoryPayload) =>
            withToken((t) =>
                apiFetch<Category>(t, "/categories", { method: "POST", ...body(payload) }),
            ),
        [withToken],
    );

    const updateCategory = React.useCallback(
        (id: number, payload: CategoryPayload) =>
            withToken((t) =>
                apiFetch<Category>(t, `/categories/${id}`, { method: "PUT", ...body(payload) }),
            ),
        [withToken],
    );

    const deleteCategory = React.useCallback(
        (id: number) =>
            withToken((t) => apiFetch<void>(t, `/categories/${id}`, { method: "DELETE" })),
        [withToken],
    );

    return {
        loadCategories,
        getCategory,
        createCategory,
        updateCategory,
        deleteCategory,
    };
}