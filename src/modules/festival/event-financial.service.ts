import { prisma } from "@/lib/prisma";
import { getTenantPrisma } from "@/lib/access-control";

export class EventFinancialService {
    /**
     * Get a comprehensive financial summary for a specific event
     */
    static async getEventFinancialSummary(organizationId: string, eventId: string) {
        const tenantPrisma = getTenantPrisma(organizationId);
        const event = await tenantPrisma.event.findUnique({
            where: { id: eventId },
            include: {
                donations: {
                    where: { isArchived: false },
                    select: { amount: true }
                },
                expenses: {
                    where: { isArchived: false, status: "APPROVED" },
                    select: { amount: true }
                }
            }
        });

        if (!event) throw new Error("Event not found");

        const totalExpenses = event.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const totalCollections = event.donations.reduce((sum, d) => sum + Number(d.amount), 0);
        const budgetTarget = event.budgetTarget ? Number(event.budgetTarget) : 0;
        const available = budgetTarget + totalCollections;
        const remaining = available - totalExpenses;
        const utilization = available > 0 ? (totalExpenses / available) * 100 : 0;

        return {
            title: event.title,
            budgetTarget,
            totalCollections,
            totalExpenses,
            remaining,
            utilization: Math.round(utilization * 100) / 100,
            progress: Math.min(utilization, 100)
        };
    }
}
