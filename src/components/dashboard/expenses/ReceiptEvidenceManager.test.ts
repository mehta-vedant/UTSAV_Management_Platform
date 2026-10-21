import { describe, expect, it } from "vitest";
import { getVisibleReceipts } from "./receipt-visibility";

describe("getVisibleReceipts", () => {
    it("keeps uploaded and pending evidence but hides failed attempts from the table", () => {
        expect(getVisibleReceipts([
            { id: "uploaded", originalFileName: "bill.pdf", status: "UPLOADED", extractionStatus: "NOT_REQUESTED" },
            { id: "pending", originalFileName: "bill.png", status: "PENDING_UPLOAD", extractionStatus: "NOT_REQUESTED" },
            { id: "failed", originalFileName: "retry.pdf", status: "FAILED", extractionStatus: "NOT_REQUESTED" },
        ]).map((receipt) => receipt.id)).toEqual(["uploaded", "pending"]);
    });
});
