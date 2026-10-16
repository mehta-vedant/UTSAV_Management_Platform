import { randomUUID } from "crypto";
import { ExpenseCategory, ReceiptExtractionStatus, ReceiptUploadStatus } from "@prisma/client";
import { z } from "zod";
import { hasPermission, getTenantPrisma, requirePermission } from "@/lib/access-control";
import { ConflictAppError, NotFoundAppError, ValidationAppError } from "@/lib/errors";
import {
    createReceiptDownloadUrl,
    createReceiptUploadPost,
    inspectReceiptObject,
    hasExpectedReceiptSignature,
    isReceiptContentType,
    isReceiptStorageConfigured,
    readReceiptBytes,
    RECEIPT_MAX_BYTES,
    type ReceiptContentType,
} from "@/lib/receipt-storage";
import { record as recordAudit } from "@/modules/core/audit.service";
import { generateGeminiReceiptJson } from "@/lib/gemini";
import { consumeAiRequest } from "@/lib/ai-rate-limit";

const ReceiptExtractionSchema = z.object({
    vendor: z.string().trim().max(200).nullable().optional(),
    amount: z.number().nonnegative().nullable().optional(),
    date: z.string().nullable().optional(),
    category: z.nativeEnum(ExpenseCategory).nullable().optional(),
    receiptNumber: z.string().trim().max(120).nullable().optional(),
    summary: z.string().trim().max(500).nullable().optional(),
});

export type ReceiptExtraction = z.infer<typeof ReceiptExtractionSchema>;

function safeFileName(fileName: string) {
    const baseName = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
    return baseName || "receipt";
}

async function getManageableExpense(organizationId: string, expenseId: string) {
    const access = await requirePermission(organizationId, "finance:create");
    const tenantPrisma = getTenantPrisma(organizationId);
    const expense = await tenantPrisma.expense.findFirst({
        where: { id: expenseId, isArchived: false },
        select: { id: true, addedById: true },
    });
    if (!expense) throw new NotFoundAppError("This expense could not be found.");
    const canManageOthers = hasPermission(access.member.role, "finance:update");
    if (expense.addedById !== access.member.id && !canManageOthers) {
        throw new ValidationAppError("You can attach receipts only to your own expense requests.");
    }
    return { ...access, tenantPrisma, expense };
}

export async function startReceiptUpload(input: {
    organizationId: string;
    expenseId: string;
    fileName: string;
    contentType: string;
    byteSize: number;
}) {
    const { organizationId, expenseId } = input;
    const { member, tenantPrisma } = await getManageableExpense(organizationId, expenseId);
    if (!isReceiptContentType(input.contentType)) throw new ValidationAppError("Upload a JPG, PNG, WEBP, or PDF receipt.");
    if (!Number.isInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > RECEIPT_MAX_BYTES) {
        throw new ValidationAppError("Receipt files must be between 1 byte and 10 MB.");
    }

    // Expired browser upload windows must be visible as retryable failures,
    // never as indefinitely pending attachments.
    await tenantPrisma.expenseReceipt.updateMany({
        where: { expenseId, status: ReceiptUploadStatus.PENDING_UPLOAD, uploadExpiresAt: { lt: new Date() } },
        data: { status: ReceiptUploadStatus.FAILED, failedAt: new Date(), failureReason: "Upload window expired. Retry the attachment." },
    });
    const receiptId = randomUUID();
    const objectKey = `organizations/${organizationId}/expenses/${expenseId}/receipts/${receiptId}-${safeFileName(input.fileName)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const receipt = await tenantPrisma.expenseReceipt.create({
        data: {
            id: receiptId,
            organizationId,
            expenseId,
            uploadedById: member.id,
            objectKey,
            originalFileName: safeFileName(input.fileName),
            contentType: input.contentType,
            byteSize: input.byteSize,
            uploadExpiresAt: expiresAt,
        },
    });

    if (!isReceiptStorageConfigured()) {
        await tenantPrisma.expenseReceipt.update({
            where: { id: receipt.id },
            data: { status: ReceiptUploadStatus.FAILED, failedAt: new Date(), failureReason: "Storage is not configured." },
        });
        return { receiptId: receipt.id, status: ReceiptUploadStatus.FAILED, message: "Receipt storage is not configured yet. Your expense is still saved; retry after S3 is configured." };
    }

    try {
        const post = await createReceiptUploadPost({ objectKey, contentType: input.contentType as ReceiptContentType });
        return { receiptId: receipt.id, status: ReceiptUploadStatus.PENDING_UPLOAD, post };
    } catch {
        await tenantPrisma.expenseReceipt.update({
            where: { id: receipt.id },
            data: { status: ReceiptUploadStatus.FAILED, failedAt: new Date(), failureReason: "Could not prepare upload." },
        });
        return { receiptId: receipt.id, status: ReceiptUploadStatus.FAILED, message: "Could not prepare the upload. Your expense is still saved; please retry." };
    }
}

export async function confirmReceiptUpload(input: {
    organizationId: string;
    expenseId: string;
    receiptId: string;
    useAiExtraction: boolean;
}) {
    const { member, tenantPrisma } = await getManageableExpense(input.organizationId, input.expenseId);
    const receipt = await tenantPrisma.expenseReceipt.findFirst({ where: { id: input.receiptId, expenseId: input.expenseId } });
    if (!receipt) throw new NotFoundAppError("This receipt could not be found.");
    if (receipt.status === ReceiptUploadStatus.UPLOADED) return { receipt, extraction: receipt.extraction };

    try {
        const object = await inspectReceiptObject(receipt.objectKey);
        if (object.byteSize < 1 || object.byteSize > RECEIPT_MAX_BYTES || object.contentType !== receipt.contentType) {
            throw new ValidationAppError("The uploaded file did not match the approved receipt details.");
        }
        const bytes = await readReceiptBytes(receipt.objectKey);
        if (!hasExpectedReceiptSignature(receipt.contentType as ReceiptContentType, bytes)) {
            throw new ValidationAppError("The uploaded file did not have the expected receipt format.");
        }
        const claimed = await tenantPrisma.expenseReceipt.updateMany({
            where: { id: receipt.id, status: ReceiptUploadStatus.PENDING_UPLOAD },
            data: {
                status: ReceiptUploadStatus.UPLOADED,
                uploadedAt: new Date(),
                failedAt: null,
                failureReason: null,
                extractionStatus: input.useAiExtraction ? ReceiptExtractionStatus.PENDING : ReceiptExtractionStatus.NOT_REQUESTED,
                extractionConsentAt: input.useAiExtraction ? new Date() : null,
            },
        });
        if (claimed.count !== 1) {
            const current = await tenantPrisma.expenseReceipt.findFirst({ where: { id: receipt.id } });
            if (current?.status === ReceiptUploadStatus.UPLOADED) return { receipt: current, extraction: current.extraction };
            throw new ConflictAppError("This receipt upload is already being processed. Please retry shortly.");
        }
        const updated = await tenantPrisma.expenseReceipt.findFirstOrThrow({ where: { id: receipt.id } });
        await recordAudit({
            organizationId: input.organizationId,
            actorMemberId: member.id,
            entityType: "ExpenseReceipt",
            entityId: receipt.id,
            action: "upload_confirmed",
            after: { expenseId: input.expenseId, usedAiExtraction: input.useAiExtraction },
        });
        const extraction = input.useAiExtraction ? await extractReceiptSuggestions(input.organizationId, receipt.id) : null;
        return { receipt: updated, extraction };
    } catch (error) {
        await tenantPrisma.expenseReceipt.update({
            where: { id: receipt.id },
            data: { status: ReceiptUploadStatus.FAILED, failedAt: new Date(), failureReason: "Upload confirmation failed." },
        });
        if (error instanceof ValidationAppError) throw error;
        throw new ConflictAppError("The receipt could not be confirmed. Your expense is still saved; retry the upload.");
    }
}

export async function extractReceiptSuggestions(organizationId: string, receiptId: string): Promise<ReceiptExtraction | null> {
    const { member, tenantPrisma } = await requirePermission(organizationId, "finance:read").then((access) => ({ ...access, tenantPrisma: getTenantPrisma(organizationId) }));
    const receipt = await tenantPrisma.expenseReceipt.findFirst({ where: { id: receiptId, status: ReceiptUploadStatus.UPLOADED, extractionStatus: ReceiptExtractionStatus.PENDING } });
    if (!receipt) throw new NotFoundAppError("This uploaded receipt could not be found.");
    if (!receipt.extractionConsentAt) throw new ValidationAppError("AI extraction needs the uploader's consent.");

    try {
        await consumeAiRequest(member.id, "receipt");
        const bytes = await readReceiptBytes(receipt.objectKey);
        const response = await generateGeminiReceiptJson({ bytes, contentType: receipt.contentType });
        const extraction = ReceiptExtractionSchema.parse(response);
        await tenantPrisma.expenseReceipt.update({
            where: { id: receipt.id },
            data: { extractionStatus: ReceiptExtractionStatus.COMPLETED, extraction: extraction as object },
        });
        await recordAudit({ organizationId, actorMemberId: member.id, entityType: "ExpenseReceipt", entityId: receipt.id, action: "ai_extraction_completed" });
        return extraction;
    } catch {
        await tenantPrisma.expenseReceipt.update({
            where: { id: receipt.id },
            data: { extractionStatus: ReceiptExtractionStatus.FAILED },
        });
        await recordAudit({ organizationId, actorMemberId: member.id, entityType: "ExpenseReceipt", entityId: receipt.id, action: "ai_extraction_failed" });
        return null;
    }
}

export async function getReceiptDownloadUrl(organizationId: string, receiptId: string) {
    const { member, tenantPrisma } = await requirePermission(organizationId, "finance:create").then((access) => ({ ...access, tenantPrisma: getTenantPrisma(organizationId) }));
    const receipt = await tenantPrisma.expenseReceipt.findFirst({
        where: { id: receiptId, status: ReceiptUploadStatus.UPLOADED },
        include: { expense: { select: { addedById: true } } },
    });
    if (!receipt) throw new NotFoundAppError("This receipt could not be found.");
    const canViewOthers = hasPermission(member.role, "finance:update");
    if (receipt.uploadedById !== member.id && receipt.expense.addedById !== member.id && !canViewOthers) {
        throw new ValidationAppError("You do not have permission to view this receipt.");
    }
    return { url: await createReceiptDownloadUrl(receipt.objectKey), fileName: receipt.originalFileName };
}

export async function applyReceiptSuggestion(input: {
    organizationId: string;
    receiptId: string;
    title?: string;
    amount?: number;
    category?: ExpenseCategory;
    notes?: string;
}) {
    const { member } = await requirePermission(input.organizationId, "finance:update");
    const tenantPrisma = getTenantPrisma(input.organizationId);
    const receipt = await tenantPrisma.expenseReceipt.findFirst({ where: { id: input.receiptId, status: ReceiptUploadStatus.UPLOADED, extractionStatus: ReceiptExtractionStatus.COMPLETED } });
    if (!receipt || !receipt.extraction) throw new NotFoundAppError("There is no completed receipt suggestion to review.");
    await tenantPrisma.$transaction([
        tenantPrisma.expense.update({
            where: { id: receipt.expenseId },
            data: {
                title: input.title?.trim() || undefined,
                amount: input.amount ? input.amount : undefined,
                category: input.category,
                notes: input.notes?.trim() || undefined,
            },
        }),
        tenantPrisma.expenseReceipt.update({
            where: { id: receipt.id },
            data: { extractionStatus: ReceiptExtractionStatus.REVIEWED, extractionReviewedAt: new Date() },
        }),
    ]);
    await recordAudit({ organizationId: input.organizationId, actorMemberId: member.id, entityType: "ExpenseReceipt", entityId: receipt.id, action: "ai_suggestion_reviewed" });
}

export async function markReceiptUploadFailed(input: { organizationId: string; expenseId: string; receiptId: string }) {
    const { member, tenantPrisma } = await getManageableExpense(input.organizationId, input.expenseId);
    const updated = await tenantPrisma.expenseReceipt.updateMany({
        where: { id: input.receiptId, expenseId: input.expenseId, status: ReceiptUploadStatus.PENDING_UPLOAD },
        data: { status: ReceiptUploadStatus.FAILED, failedAt: new Date(), failureReason: "Browser upload did not complete. Retry the attachment." },
    });
    if (updated.count) {
        await recordAudit({ organizationId: input.organizationId, actorMemberId: member.id, entityType: "ExpenseReceipt", entityId: input.receiptId, action: "upload_failed" });
    }
}
