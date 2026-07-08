// src/lib/http.ts
// Shared response-parsing helper used by every API module so a failed
// request always yields the same shape, regardless of which module made it.

export class ApiError extends Error {
    status: number;
    errorCode?: string;
    validationErrors?: Record<string, string>;

    constructor(
        message: string,
        status: number,
        errorCode?: string,
        validationErrors?: Record<string, string>,
    ) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.errorCode = errorCode;
        this.validationErrors = validationErrors;
    }
}

/**
 * Parses a fetch Response, throwing an ApiError (with message/errorCode/
 * validationErrors unwrapped from the backend's ErrorResponse body) when the
 * request failed, or returning the parsed JSON body otherwise.
 */
export async function parseJsonOrThrow<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        let message = `Request failed with status ${res.status}`;
        let errorCode: string | undefined;
        let validationErrors: Record<string, string> | undefined;

        if (text) {
            try {
                const json = JSON.parse(text);
                message = json.message ?? json.error ?? text;
                errorCode = json.errorCode;
                validationErrors = json.validationErrors;
            } catch {
                message = text;
            }
        }

        throw new ApiError(message, res.status, errorCode, validationErrors);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}
