import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpenseService } from "./expense.service";

const mocks = vi.hoisted(() => ({
    updateMany: vi.fn(),
    createAudit: vi.fn(),
}));

vi.mock("@/lib/access-control", () => ({
    requirePermission: vi.fn().mockResolvedValue({
        member: { id: "member_1", role: "TREASURER" },
    }),
    getTenantPrisma: () => ({
        expense: { updateMany: mocks.updateMany },
        auditLog: { create: mocks.createAudit },
    }),
}));

vi.mock("@/modules/core/audit.service", () => ({
    AuditService: {
        record: mocks.createAudit,
    },
}));

describe("ExpenseService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns a helpful conflict when approving an already processed expense", async () => {
        mocks.updateMany.mockResolvedValue({ count: 0 });

        await expect(ExpenseService.approveExpense("org_1", "expense_1")).rejects.toThrow(
            "This expense was already processed."
        );
    });

    it("records an audit log when approving an expense", async () => {
        mocks.updateMany.mockResolvedValue({ count: 1 });
        mocks.createAudit.mockResolvedValue({});

        await expect(ExpenseService.approveExpense("org_1", "expense_1")).resolves.toEqual({ success: true });
        expect(mocks.createAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId: "org_1",
                actorMemberId: "member_1",
                entityType: "Expense",
                entityId: "expense_1",
                action: "approve",
            })
        );
    });
});
