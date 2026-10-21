import { describe, expect, it } from "vitest";
import { getActiveReceipt, getVisibleReceipts } from "./receipt-visibility";

describe("getVisibleReceipts", () => {
    it("keeps uploaded and pending evidence but hides failed attempts from the table", () => {
        expect(getVisibleReceipts([
            { id: "uploaded", originalFileName: "bill.pdf", status: "UPLOADED", extractionStatus: "NOT_REQUESTED" },
            { id: "pending", originalFileName: "bill.png", status: "PENDING_UPLOAD", extractionStatus: "NOT_REQUESTED" },
            { id: "failed", originalFileName: "retry.pdf", status: "FAILED", extractionStatus: "NOT_REQUESTED" },
        ]).map((receipt) => receipt.id)).toEqual(["uploaded", "pending"]);
    });
});

describe("getActiveReceipt", () => {
    it("returns the one active uploaded receipt", () => {
        expect(getActiveReceipt([
            { id: "active", originalFileName: "bill.pdf", status: "UPLOADED", extractionStatus: "NOT_REQUESTED" },
            { id: "failed", originalFileName: "retry.pdf", status: "FAILED", extractionStatus: "NOT_REQUESTED" },
        ])?.id).toBe("active");
    });

    it("does not let an expired upload window permanently block a new receipt", () => {
        expect(getActiveReceipt([
            { id: "expired", originalFileName: "old.pdf", status: "PENDING_UPLOAD", extractionStatus: "NOT_REQUESTED", uploadExpiresAt: new Date(Date.now() - 1_000) },
        ])).toBeNull();
    });
});
