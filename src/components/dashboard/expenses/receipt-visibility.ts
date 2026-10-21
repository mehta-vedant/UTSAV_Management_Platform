export interface ReceiptListItem {
    id: string;
    originalFileName: string;
    status: "PENDING_UPLOAD" | "UPLOADED" | "FAILED";
    extractionStatus: string;
    extraction?: unknown;
    uploadExpiresAt?: Date | string | null;
}

export function getVisibleReceipts(receipts: ReceiptListItem[]) {
    // Failed attempts remain in the database/audit trail, but are not evidence
    // and should never permanently clutter the expense table.
    return receipts.filter((receipt) => receipt.status !== "FAILED");
}

export function getActiveReceipt(receipts: ReceiptListItem[]) {
    return getVisibleReceipts(receipts).find((receipt) => {
        if (receipt.status !== "PENDING_UPLOAD") return true;
        return !receipt.uploadExpiresAt || new Date(receipt.uploadExpiresAt).getTime() >= Date.now();
    }) || null;
}
