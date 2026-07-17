import { normalizeError } from "./errors";

export type ActionResponse<T = undefined> =
    | ({ ok: true; success: true; error?: undefined; message?: undefined } & (T extends undefined ? {} : { data: T }))
    | ActionFailureResponse;

export type ActionFailureResponse = {
    ok: false;
    success: false;
    code: string;
    message: string;
    error: string;
};

export function actionSuccess(): ActionResponse;
export function actionSuccess<T>(data: T): ActionResponse<T>;
export function actionSuccess<T>(data?: T): ActionResponse<T | undefined> {
    if (data === undefined) {
        return { ok: true, success: true } as ActionResponse<T | undefined>;
    }

    return { ok: true, success: true, data } as ActionResponse<T | undefined>;
}

export function actionFailure(error: unknown, fallback?: string): ActionFailureResponse {
    const normalized = normalizeError(error, fallback);
    return {
        ok: false,
        success: false,
        code: normalized.code,
        message: normalized.message,
        error: normalized.message,
    };
}
