export const RECEIPT_MAX_BYTES = 1 * 1024 * 1024;
export const RECEIPT_MAX_SIZE_LABEL = "1 MB";

export const RECEIPT_ALLOWED_CONTENT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
] as const;

export type ReceiptContentType = (typeof RECEIPT_ALLOWED_CONTENT_TYPES)[number];
