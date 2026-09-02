import { getTenantPrisma } from "@/lib/access-control";
import { ExpenseStatus } from "@prisma/client";

export async function getPublicApprovedExpenses(organizationId: string, limit = 50) {
    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.expense.findMany({
        where: {
            status: ExpenseStatus.APPROVED,
            isArchived: false,
        },
        select: {
            id: true,
            title: true,
            amount: true,
            category: true,
            paymentMode: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
    });
}
