export interface ReceiptListItem {
    id: string;
    originalFileName: string;
    status: "PENDING_UPLOAD" | "UPLOADED" | "FAILED";
    extractionStatus: string;
}

export function getVisibleReceipts(receipts: ReceiptListItem[]) {
    // Failed attempts remain in the database/audit trail, but are not evidence
    // and should never permanently clutter the expense table.
    return receipts.filter((receipt) => receipt.status !== "FAILED");
}
