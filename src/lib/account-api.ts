// src/lib/account-api.ts
import * as React from "react";
import { useAuth } from "@/lib/auth";
import { parseJsonOrThrow } from "@/lib/http";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const AUTH_ENDPOINT = `${BASE_URL}/api/auth`;

export interface AccountProfile {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    location: string | null;
    department: string | null;
    role: string;
}

export interface UpdateProfilePayload {
    firstName: string;
    lastName: string;
}

export interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}

export function useAccountApi() {
    const { getToken } = useAuth();

    const withToken = React.useCallback(
        async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
            const token = await getToken();
            if (!token) throw new Error("Not authenticated");
            return fn(token);
        },
        [getToken],
    );

    const headers = (token: string) => ({
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
    });

    const getMe = React.useCallback(
        () =>
            withToken(async (token) => {
                const res = await fetch(`${AUTH_ENDPOINT}/me`, { headers: headers(token) });
                return parseJsonOrThrow<AccountProfile>(res);
            }),
        [withToken],
    );

    const updateProfile = React.useCallback(
        (payload: UpdateProfilePayload) =>
            withToken(async (token) => {
                const res = await fetch(`${AUTH_ENDPOINT}/me`, {
                    method: "PUT",
                    headers: headers(token),
                    body: JSON.stringify(payload),
                });
                return parseJsonOrThrow<AccountProfile>(res);
            }),
        [withToken],
    );

    const changePassword = React.useCallback(
        (payload: ChangePasswordPayload) =>
            withToken(async (token) => {
                const res = await fetch(`${AUTH_ENDPOINT}/change-password`, {
                    method: "PUT",
                    headers: headers(token),
                    body: JSON.stringify(payload),
                });
                await parseJsonOrThrow<void>(res);
            }),
        [withToken],
    );

    return { getMe, updateProfile, changePassword };
}
