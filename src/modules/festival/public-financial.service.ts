import { getTenantPrisma } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { assertFestivalMode } from "@/lib/organization-mode";
import { ExpenseStatus, Prisma } from "@prisma/client";

export interface PublicFinancialOverview {
    totalDonations: Prisma.Decimal;
    totalExpenses: Prisma.Decimal;
    remainingBalance: Prisma.Decimal;
    fundraisingTarget: Prisma.Decimal | null;
    utilizationRate: number;
    isOverspent: boolean;
}

/**
 * Public Financial Service
 * Read-only analytics for the public transparency dashboard.
 * NO authentication required.
 */
export class PublicFinancialService {
    /**
     * Get public financial overview
     * Strictly read-only, excludes internal IDs and audit fields.
     */
    static async getPublicFinancialOverview(organizationId: string): Promise<PublicFinancialOverview> {
        const tenantPrisma = getTenantPrisma(organizationId);

        const [donations, expenses, organization] = await Promise.all([
            // Total Donations (Active only)
            tenantPrisma.donation.aggregate({
                where: { isArchived: false },
                _sum: { amount: true },
            }),
            // Total Approved Expenses (Active only)
            tenantPrisma.expense.aggregate({
                where: {
                    status: ExpenseStatus.APPROVED,
                    isArchived: false,
                },
                _sum: { amount: true },
            }),
            prisma.organization.findUnique({
                where: { id: organizationId },
                select: { type: true, publicFundraisingTarget: true },
            }),
        ]);

        assertFestivalMode(organization);

        const totalDonations = donations._sum.amount || new Prisma.Decimal(0);
        const totalExpenses = expenses._sum.amount || new Prisma.Decimal(0);
        const fundraisingTarget = organization?.publicFundraisingTarget || null;

        const remainingBalance = totalDonations.minus(totalExpenses);
        const rawUtilization = totalDonations.isZero()
            ? 0
            : totalExpenses.dividedBy(totalDonations).times(100).toNumber();

        return {
            totalDonations,
            totalExpenses,
            remainingBalance,
            fundraisingTarget,
            utilizationRate: rawUtilization,
            isOverspent: rawUtilization > 100,
        };
    }
}
