import { describe, expect, it, vi } from "vitest";
import { recordDonationAction } from "./donation.actions";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/modules/finance/donation.service", () => ({
    createDonation: vi.fn(),
}));

describe("donation actions", () => {
    it("returns a structured validation error for invalid amounts", async () => {
        const result = await recordDonationAction({
            organizationId: "org_1",
            donorName: "Asha",
            amount: 0,
            category: "GENERAL",
            receivedAt: new Date().toISOString(),
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe("Amount must be greater than zero");
        }
    });
});
