import { getTenantPrisma, requirePermission } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { ExpenseStatus, Prisma } from "@prisma/client";

/**
 * Enterprise-Grade Financial Service
 * Handles cross-domain financial analytics and high-level balance tracking
 */
export class FinancialService {
    /**
     * Get the ultimate financial health overview for a Organization
     * Returns: Total Donations, Approved Expenses, and Remaining Balance
     */
    static async getOrganizationFinancialOverview(organizationId: string) {
        // 1. Validate Access (ADMIN, TREASURER, COMMITTEE_MEMBER)
        await requirePermission(organizationId, "finance:read");

        // 2. Use isolated Prisma client
        const tenantPrisma = getTenantPrisma(organizationId);

        // 3. Parallel fetching for optimal performance
        const [funds, sponsorships, expenses, pendingExpenses, bhogItems, Organization] = await Promise.all([
            // Total Funds (Internal/General - Excludes Sponsorships)
            tenantPrisma.donation.aggregate({
                where: {
                    isArchived: false,
                    category: { not: "SPONSORSHIP" as any }
                },
                _sum: { amount: true },
                _count: { _all: true },
            }),
            // Total Sponsorships (External)
            tenantPrisma.donation.aggregate({
                where: {
                    isArchived: false,
                    category: "SPONSORSHIP" as any
                },
                _sum: { amount: true },
                _count: { _all: true },
            }),
            // Total Approved Expenses (Active only)
            tenantPrisma.expense.aggregate({
                where: {
                    status: ExpenseStatus.APPROVED,
                    isArchived: false
                },
                _sum: { amount: true },
                _count: { _all: true },
            }),
            // Total Pending Expenses
            tenantPrisma.expense.aggregate({
                where: {
                    status: ExpenseStatus.PENDING,
                    isArchived: false
                },
                _sum: { amount: true },
                _count: { _all: true },
            }),
            // Pending Bhog Sponsorships
            tenantPrisma.bhogItem.count({
                where: { isArchived: false, status: "PENDING" }
            }),
            // Fetch private finance settings
            prisma.organization.findUnique({
                where: { id: organizationId },
                select: { openingBalance: true, budgetTarget: true, internalBudgetLimit: true, type: true }
            })
        ]);

        const totalFunds = funds._sum.amount || new Prisma.Decimal(0);
        const totalSponsorships = sponsorships._sum.amount || new Prisma.Decimal(0);
        const memberDonations = totalFunds; // Non-sponsorship donations from the app

        const totalExpenses = expenses._sum.amount || new Prisma.Decimal(0);
        const totalPendingExpenses = pendingExpenses._sum.amount || new Prisma.Decimal(0);
        const openingBalance = Organization?.openingBalance || Organization?.budgetTarget || new Prisma.Decimal(0);
        const internalBudgetLimit = Organization?.internalBudgetLimit || null;
        const isFestival = Organization?.type === "FESTIVAL";

        // 4. Decimal-safe calculations
        // For FESTIVAL: Total Collection = Opening Balance + Member Donations + Sponsorships
        // For CLUB/PRIVATE: Total Available = Opening Allotment + Member Donations + Sponsorships
        const totalCollection = isFestival
            ? openingBalance.plus(memberDonations).plus(totalSponsorships)
            : openingBalance.plus(memberDonations).plus(totalSponsorships);

        const remainingBalance = totalCollection.minus(totalExpenses);

        // 5. Ratios
        // Utilization = Approved Expenses / Total Collection
        const rawUtilization = totalCollection.isZero()
            ? 0
            : totalExpenses.dividedBy(totalCollection).times(100).toNumber();

        // Safe count access
        const fundCount = funds._count && typeof funds._count === 'object' ? funds._count._all : 0;
        const sponsorshipCount = sponsorships._count && typeof sponsorships._count === 'object' ? sponsorships._count._all : 0;
        const totalDonationCount = fundCount + sponsorshipCount;

        return {
            totalDonations: Number(memberDonations), // App-only member donations
            totalFunds: Number(totalFunds),         // General/Internal
            totalSponsorships: Number(totalSponsorships), // Sponsorship category
            totalLiquidity: Number(totalCollection), // Unified Total Collection

            totalDonationCount,
            fundCount,
            sponsorshipCount,

            totalExpenses: Number(totalExpenses),
            approvedExpenseCount: expenses._count._all,
            totalPendingExpenses: Number(totalPendingExpenses),
            pendingExpenseCount: pendingExpenses._count._all,
            pendingBhogCount: bhogItems,
            remainingBalance: Number(remainingBalance),
            openingBalance: Number(openingBalance),
            internalBudgetLimit: internalBudgetLimit ? Number(internalBudgetLimit) : null,

            utilizationRate: rawUtilization,
            isOverspent: rawUtilization > 100,

            // Progress is now relative to what we've collected vs what we've spent? 
            // Or maybe we don't need progress for Festivals if there's no "Target"
            collectionProgress: totalCollection.isZero() ? 0 : totalExpenses.dividedBy(totalCollection).times(100).toNumber(),
        };
    }

    /**
     * Unified Activity Timeline
     */
    static async getRecentActivity(organizationId: string, limit = 5) {
        const tenantPrisma = getTenantPrisma(organizationId);

        const [donations, expenses, members] = await Promise.all([
            tenantPrisma.donation.findMany({
                where: { isArchived: false },
                orderBy: { createdAt: "desc" },
                take: limit,
                select: { id: true, donorName: true, amount: true, createdAt: true, category: true }
            }),
            tenantPrisma.expense.findMany({
                where: { isArchived: false },
                orderBy: { createdAt: "desc" },
                take: limit,
                select: { id: true, title: true, amount: true, createdAt: true, status: true }
            }),
            tenantPrisma.organizationMember.findMany({
                where: { isArchived: false },
                orderBy: { createdAt: "desc" },
                take: limit,
                include: { user: { select: { name: true, email: true } } }
            })
        ]);

        const timeline = [
            ...donations.map(d => ({ id: d.id, type: "DONATION" as const, title: `Donation from ${d.donorName}`, amount: Number(d.amount), date: d.createdAt })),
            ...expenses.map(e => ({ id: e.id, type: "EXPENSE" as const, title: `Expense: ${e.title}`, amount: Number(e.amount), date: e.createdAt, status: e.status })),
            ...members.map(m => ({ id: m.id, type: "MEMBER" as const, title: `Member Joined: ${m.user?.name || m.email}`, date: m.createdAt, identity: m.user?.email || m.email }))
        ];

        // Sort by date descending
        const sorted = timeline.sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());

        // Deduplicate: If the same identity joined multiple times in the recent list, keep only the latest one
        const seenIdentities = new Set<string>();
        const deduplicated = sorted.filter(item => {
            if (item.type === "MEMBER") {
                const ident = (item as any).identity;
                if (seenIdentities.has(ident)) return false;
                seenIdentities.add(ident);
            }
            return true;
        });

        return deduplicated.slice(0, 10);
    }
}
