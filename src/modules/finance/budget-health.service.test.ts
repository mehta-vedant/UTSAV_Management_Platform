import { describe, expect, it, vi } from "vitest";
import { getBudgetHealthReport } from "./budget-health.service";

const mocks = vi.hoisted(() => ({
    organizationFindUnique: vi.fn(),
    donationAggregate: vi.fn(),
    expenseAggregate: vi.fn(),
    expenseGroupBy: vi.fn(),
    eventFindMany: vi.fn(),
}));

vi.mock("@/lib/access-control", () => ({
    requirePermission: vi.fn().mockResolvedValue({ member: { id: "member_1", role: "TREASURER" } }),
    getTenantPrisma: () => ({
        organization: { findUnique: mocks.organizationFindUnique },
        donation: { aggregate: mocks.donationAggregate },
        expense: { aggregate: mocks.expenseAggregate, groupBy: mocks.expenseGroupBy },
        event: { findMany: mocks.eventFindMany },
    }),
}));

describe("budget health", () => {
    it("uses recorded amounts and pending commitments in its scenarios", async () => {
        mocks.organizationFindUnique.mockResolvedValue({ endDate: new Date(Date.now() + 10 * 86_400_000), openingBalance: 100, publicFundraisingTarget: 1000, budgetTarget: null });
        mocks.donationAggregate.mockResolvedValue({ _sum: { amount: 500 } });
        mocks.expenseAggregate.mockResolvedValueOnce({ _sum: { amount: 200 } }).mockResolvedValueOnce({ _sum: { amount: 150 } }).mockResolvedValueOnce({ _sum: { amount: 300 } });
        mocks.expenseGroupBy.mockResolvedValue([{ category: "FOOD", _sum: { amount: 200 } }]);
        mocks.eventFindMany.mockResolvedValue([{ id: "event_1", title: "Aarti", budgetTarget: 100, expenses: [{ amount: 120 }] }]);

        const report = await getBudgetHealthReport("org_1");

        expect(report.availableBalance).toBe(400);
        expect(report.pendingCommitments).toBe(150);
        expect(report.scenarios).toHaveLength(3);
        expect(report.risks.join(" ")).toContain("Aarti");
    });
});
