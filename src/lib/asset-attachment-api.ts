// src/lib/asset-attachment-api.ts
import * as React from "react";
import { useAuth } from "@/lib/auth";
import { clearPersistedAuthSession } from "@/lib/auth";
import { parseJsonOrThrow } from "@/lib/http";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ASSETS_ENDPOINT = `${BASE_URL}/api/v1/assets`;
const JWT_TEMPLATE = "cic-inventory";

export interface AssetAttachment {
    id: number;
    fileName: string;
    fileSize: number;
    contentType: string | null;
    uploadedAt: string;
}

function isImageContentType(contentType: string | null): boolean {
    return !!contentType && contentType.startsWith("image/");
}

async function authorizedFetch(token: string, url: string, init: RequestInit = {}) {
    const res = await fetch(url, {
        ...init,
        headers: {
            Accept: "application/json",
            ...(init.headers ?? {}),
            Authorization: `Bearer ${token}`,
        },
    });
    if (res.status === 401) {
        clearPersistedAuthSession();
    }
    return res;
}

export function useAssetAttachmentApi() {
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

    const list = React.useCallback(
        (assetId: string | number) =>
            withToken(async (token) => {
                const res = await authorizedFetch(token, `${ASSETS_ENDPOINT}/${assetId}/attachments`);
                return parseJsonOrThrow<AssetAttachment[]>(res);
            }),
        [withToken],
    );

    const upload = React.useCallback(
        (assetId: string | number, file: File) =>
            withToken(async (token) => {
                const formData = new FormData();
                formData.append("file", file);
                // No Content-Type header here on purpose — the browser sets the
                // multipart boundary itself when the body is a FormData instance.
                const res = await authorizedFetch(token, `${ASSETS_ENDPOINT}/${assetId}/attachments`, {
                    method: "POST",
                    body: formData,
                });
                return parseJsonOrThrow<AssetAttachment>(res);
            }),
        [withToken],
    );

    const remove = React.useCallback(
        (assetId: string | number, attachmentId: number) =>
            withToken(async (token) => {
                const res = await authorizedFetch(
                    token,
                    `${ASSETS_ENDPOINT}/${assetId}/attachments/${attachmentId}`,
                    { method: "DELETE" },
                );
                await parseJsonOrThrow<void>(res);
            }),
        [withToken],
    );

    const fetchBlob = React.useCallback(
        (assetId: string | number, attachmentId: number, mode: "download" | "view") =>
            withToken(async (token) => {
                const res = await authorizedFetch(
                    token,
                    `${ASSETS_ENDPOINT}/${assetId}/attachments/${attachmentId}/${mode}`,
                );
                if (!res.ok) {
                    throw new Error(`Failed to ${mode} attachment (status ${res.status})`);
                }
                return res.blob();
            }),
        [withToken],
    );

    const download = React.useCallback(
        async (assetId: string | number, attachment: AssetAttachment) => {
            const blob = await fetchBlob(assetId, attachment.id, "download");
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = attachment.fileName;
            a.click();
            URL.revokeObjectURL(url);
        },
        [fetchBlob],
    );

    const getViewUrl = React.useCallback(
        async (assetId: string | number, attachment: AssetAttachment) => {
            const blob = await fetchBlob(assetId, attachment.id, "view");
            return URL.createObjectURL(blob);
        },
        [fetchBlob],
    );

    return { list, upload, remove, download, getViewUrl };
}

export { isImageContentType };
