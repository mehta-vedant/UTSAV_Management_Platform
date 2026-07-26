import { getTenantPrisma } from "@/lib/access-control";
import { Prisma, ExpenseStatus } from "@prisma/client";

export interface OrganizationFinancialSummary {
    totalSpent: Prisma.Decimal;
    organizationSpent: Prisma.Decimal;
    eventSpent: Prisma.Decimal;
    eventBreakdown: {
        eventId: string;
        title: string;
        budgetTarget: Prisma.Decimal;
        spent: Prisma.Decimal;
        remaining: Prisma.Decimal;
        utilization: number;
    }[];
}

export async function getOrganizationSummary(organizationId: string): Promise<OrganizationFinancialSummary> {
    const tenantPrisma = getTenantPrisma(organizationId);

    const [eventsWithExpenses, orgLevelExpenses] = await Promise.all([
        tenantPrisma.event.findMany({
            where: { isArchived: false },
            include: {
                expenses: {
                    where: {
                        status: ExpenseStatus.APPROVED,
                        isArchived: false
                    },
                    select: { amount: true }
                }
            }
        }),
        tenantPrisma.expense.findMany({
            where: {
                organizationId,
                eventId: null,
                status: ExpenseStatus.APPROVED,
                isArchived: false
            },
            select: { amount: true }
        })
    ]);

    const organizationSpent = orgLevelExpenses.reduce(
        (sum, exp) => sum.add(exp.amount),
        new Prisma.Decimal(0)
    );

    let eventSpentTotal = new Prisma.Decimal(0);
    const eventBreakdown = eventsWithExpenses.map(event => {
        const spent = event.expenses.reduce(
            (sum, exp) => sum.add(exp.amount),
            new Prisma.Decimal(0)
        );

        eventSpentTotal = eventSpentTotal.add(spent);

        const budgetTarget = event.budgetTarget || new Prisma.Decimal(0);
        const remaining = budgetTarget.sub(spent);
        const utilization = Number(budgetTarget) > 0
            ? Number((Number(spent) / Number(budgetTarget)) * 100)
            : 0;

        return {
            eventId: event.id,
            title: event.title,
            budgetTarget,
            spent,
            remaining,
            utilization
        };
    });

    return {
        totalSpent: organizationSpent.add(eventSpentTotal),
        organizationSpent,
        eventSpent: eventSpentTotal,
        eventBreakdown
    };
}
