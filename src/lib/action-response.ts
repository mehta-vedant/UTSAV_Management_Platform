import { normalizeError } from "./errors";

export type ActionResult<T = undefined> =
    | { success: true; data: T; error?: undefined; code?: undefined }
    | { success: false; error: string; code?: string; data?: undefined };

export function actionSuccess(): ActionResult<undefined>;
export function actionSuccess<T>(data: T): ActionResult<T>;
export function actionSuccess<T>(data?: T): ActionResult<T | undefined> {
    if (data === undefined) {
        return { success: true, data: undefined as T | undefined };
    }
    return { success: true, data };
}

export function actionFailure(error: unknown, fallback?: string): ActionResult<never> {
    const normalized = normalizeError(error, fallback);
    return {
        success: false,
        error: normalized.message,
        code: normalized.code,
    };
}
