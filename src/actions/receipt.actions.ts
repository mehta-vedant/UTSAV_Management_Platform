"use server";

import { z } from "zod";
import { ExpenseCategory } from "@prisma/client";
import { withAction } from "@/lib/action";
import {
    applyReceiptSuggestion,
    confirmReceiptUpload,
    getReceiptDownloadUrl,
    markReceiptUploadFailed,
    startReceiptUpload,
} from "@/modules/finance/receipt.service";

const StartReceiptSchema = z.object({
    organizationId: z.string().min(1),
    expenseId: z.string().min(1),
    fileName: z.string().min(1).max(160),
    contentType: z.string().min(1).max(100),
    byteSize: z.number().int().positive(),
});

const ConfirmReceiptSchema = z.object({
    organizationId: z.string().min(1),
    expenseId: z.string().min(1),
    receiptId: z.string().min(1),
    useAiExtraction: z.boolean(),
});

export async function startReceiptUploadAction(input: z.infer<typeof StartReceiptSchema>) {
    return withAction(() => startReceiptUpload(StartReceiptSchema.parse(input)), {
        paths: [{ path: "/[orgSlug]/dashboard/expenses", type: "page" }],
    });
}

const FailedUploadSchema = ConfirmReceiptSchema.omit({ useAiExtraction: true });
export async function markReceiptUploadFailedAction(input: z.infer<typeof FailedUploadSchema>) {
    return withAction(() => markReceiptUploadFailed(FailedUploadSchema.parse(input)), {
        paths: [{ path: "/[orgSlug]/dashboard/expenses", type: "page" }],
    });
}

export async function confirmReceiptUploadAction(input: z.infer<typeof ConfirmReceiptSchema>) {
    return withAction(() => confirmReceiptUpload(ConfirmReceiptSchema.parse(input)), {
        paths: [{ path: "/[orgSlug]/dashboard/expenses", type: "page" }],
    });
}

export async function getReceiptDownloadUrlAction(organizationId: string, receiptId: string) {
    return withAction(() => getReceiptDownloadUrl(organizationId, receiptId));
}

const ApplySuggestionSchema = z.object({
    organizationId: z.string().min(1),
    receiptId: z.string().min(1),
    title: z.string().max(200).optional(),
    amount: z.number().positive().optional(),
    category: z.nativeEnum(ExpenseCategory).optional(),
    notes: z.string().max(1000).optional(),
});

export async function applyReceiptSuggestionAction(input: z.infer<typeof ApplySuggestionSchema>) {
    return withAction(() => applyReceiptSuggestion(ApplySuggestionSchema.parse(input)), {
        paths: [{ path: "/[orgSlug]/dashboard/expenses", type: "page" }],
    });
}
