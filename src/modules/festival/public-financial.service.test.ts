import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicFinancialOverview } from "./public-financial.service";

const mocks = vi.hoisted(() => ({
    aggregateDonation: vi.fn(),
    aggregateExpense: vi.fn(),
    findOrganization: vi.fn(),
}));

vi.mock("@/lib/access-control", () => ({
    getTenantPrisma: () => ({
        donation: { aggregate: mocks.aggregateDonation },
        expense: { aggregate: mocks.aggregateExpense },
    }),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        organization: { findUnique: mocks.findOrganization },
    },
}));

describe("getPublicFinancialOverview", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.aggregateDonation.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(1000) } });
        mocks.aggregateExpense.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(250) } });
        mocks.findOrganization.mockResolvedValue({
            type: "FESTIVAL",
            openingBalance: new Prisma.Decimal(5000),
            publicFundraisingTarget: new Prisma.Decimal(10000),
        });
    });

    it("exposes only public fundraising target, never opening balance", async () => {
        const result = await getPublicFinancialOverview("org_1");

        expect(result.totalDonations.toString()).toBe("6000");
        expect(result.totalExpenses.toString()).toBe("250");
        expect(result.remainingBalance.toString()).toBe("5750");
        expect(result.fundraisingTarget?.toString()).toBe("10000");
        expect(result).not.toHaveProperty("openingBalance");
        expect(result).not.toHaveProperty("budgetTarget");
    });

    it("rejects Club organizations from the public Festival finance surface", async () => {
        mocks.findOrganization.mockResolvedValue({
            type: "CLUB",
            openingBalance: new Prisma.Decimal(5000),
            publicFundraisingTarget: null,
        });

        await expect(getPublicFinancialOverview("club_1")).rejects.toThrow(
            "This public Festival page is not available for Clubs."
        );
    });
});
