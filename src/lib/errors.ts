import { z } from "zod";

export type AppErrorCode =
    | "AUTHENTICATION_REQUIRED"
    | "NOT_AUTHORIZED"
    | "VALIDATION_ERROR"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INVARIANT_VIOLATION"
    | "UNKNOWN_ERROR";

export class AppError extends Error {
    code: AppErrorCode;
    status: number;

    constructor(code: AppErrorCode, message: string, status = 400) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.status = status;
    }
}

export class AuthenticationError extends AppError {
    constructor(message = "Please sign in to continue.") {
        super("AUTHENTICATION_REQUIRED", message, 401);
    }
}

export class AuthorizationError extends AppError {
    constructor(message = "You do not have permission to perform this action.") {
        super("NOT_AUTHORIZED", message, 403);
    }
}

export class ValidationAppError extends AppError {
    constructor(message = "Please check the details and try again.") {
        super("VALIDATION_ERROR", message, 422);
    }
}

export class NotFoundAppError extends AppError {
    constructor(message = "This record could not be found.") {
        super("NOT_FOUND", message, 404);
    }
}

export class ConflictAppError extends AppError {
    constructor(message = "This record was changed already. Please refresh and try again.") {
        super("CONFLICT", message, 409);
    }
}

export class InvariantError extends AppError {
    constructor(message = "Something went wrong. Please try again.") {
        super("INVARIANT_VIOLATION", message, 500);
    }
}

export function normalizeError(error: unknown, fallback = "Something went wrong. Please try again.") {
    if (error instanceof z.ZodError) {
        return {
            code: "VALIDATION_ERROR" as const,
            message: error.issues[0]?.message || "Please check the details and try again.",
        };
    }

    if (error instanceof AppError) {
        return {
            code: error.code,
            message: error.message,
        };
    }

    if (error instanceof Error) {
        return {
            code: "UNKNOWN_ERROR" as const,
            message: error.message || fallback,
        };
    }

    return {
        code: "UNKNOWN_ERROR" as const,
        message: fallback,
    };
}
