import { getTenantPrisma } from "@/lib/access-control";
import { ExpenseStatus } from "@prisma/client";

export async function getFullAuditTrail(organizationId: string, limit = 500) {
    const tenantPrisma = getTenantPrisma(organizationId);

    const [donations, expenses] = await Promise.all([
        tenantPrisma.donation.findMany({
            where: { isArchived: false },
            select: {
                id: true,
                donorName: true,
                amount: true,
                category: true,
                receivedAt: true,
                event: { select: { title: true } },
            },
            orderBy: { receivedAt: "desc" },
            take: limit,
        }),
        tenantPrisma.expense.findMany({
            where: {
                status: ExpenseStatus.APPROVED,
                isArchived: false
            },
            select: {
                id: true,
                title: true,
                amount: true,
                category: true,
                requestedAt: true,
                event: { select: { title: true } },
            },
            orderBy: { requestedAt: "desc" },
            take: limit,
        })
    ]);

    const normalizedDonations = donations.map(d => ({
        id: d.id,
        type: "INCOME" as const,
        source: "Donation",
        title: "Donation",
        amount: Number(d.amount),
        date: d.receivedAt,
        category: d.category || "General",
        eventTitle: d.event?.title || null,
        verified: true
    }));

    const normalizedExpenses = expenses.map(e => ({
        id: e.id,
        type: "EXPENSE" as const,
        source: "Audited Purchase",
        title: e.title,
        amount: Number(e.amount),
        date: e.requestedAt,
        category: e.category,
        eventTitle: e.event?.title || null,
        verified: true
    }));

    return [...normalizedDonations, ...normalizedExpenses]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, limit);
}

export async function getTransparencyStats(organizationId: string) {
    const tenantPrisma = getTenantPrisma(organizationId);

    const [donationAgg, expenseAgg] = await Promise.all([
        tenantPrisma.donation.aggregate({
            where: { isArchived: false },
            _sum: { amount: true },
            _count: { _all: true }
        }),
        tenantPrisma.expense.aggregate({
            where: { status: ExpenseStatus.APPROVED, isArchived: false },
            _sum: { amount: true },
            _count: { _all: true }
        })
    ]);

    return {
        totalDonations: Number(donationAgg._sum.amount || 0),
        donationCount: donationAgg._count._all,
        totalExpenses: Number(expenseAgg._sum.amount || 0),
        expenseCount: expenseAgg._count._all,
        auditHealth: 100
    };
}

export async function getPublicSchedule(organizationId: string) {
    const tenantPrisma = getTenantPrisma(organizationId);

    const events = await tenantPrisma.event.findMany({
        where: { isArchived: false },
        include: {
            donations: {
                where: { isArchived: false },
                select: { amount: true }
            },
            expenses: {
                where: { isArchived: false, status: ExpenseStatus.APPROVED },
                select: { amount: true }
            }
        },
        orderBy: { startTime: "asc" }
    });

    return events.map((event) => {
        const totalCollected = event.donations.reduce((sum, donation) => sum + Number(donation.amount), 0);
        const totalSpent = event.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

        return {
            id: event.id,
            title: event.title,
            description: event.description,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            category: event.status,
            totalCollected,
            totalSpent,
            balance: totalCollected - totalSpent,
        };
    });
}
