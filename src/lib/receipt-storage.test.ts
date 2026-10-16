import { describe, expect, it } from "vitest";
import { RECEIPT_MAX_BYTES, isReceiptContentType } from "./receipt-storage";

describe("receipt storage input boundaries", () => {
    it("accepts only explicit receipt formats", () => {
        expect(isReceiptContentType("image/jpeg")).toBe(true);
        expect(isReceiptContentType("application/pdf")).toBe(true);
        expect(isReceiptContentType("image/svg+xml")).toBe(false);
        expect(isReceiptContentType("application/octet-stream")).toBe(false);
    });

    it("keeps the file-size limit at 10 MB", () => {
        expect(RECEIPT_MAX_BYTES).toBe(10 * 1024 * 1024);
    });
});
