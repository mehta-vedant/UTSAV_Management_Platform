import { requirePermission, getTenantPrisma } from "@/lib/access-control";
import { DonationCategory, ExpenseCategory, ExpenseStatus, PaymentMode, Prisma } from "@prisma/client";

export type TimeBucket = "daily" | "weekly" | "monthly";

export interface CashFlowPoint {
    /** ISO-style key used only to preserve chronological order. */
    sortKey: string;
    label: string;
    chartLabel: string;
    income: number;
    expense: number;
    balance: number;
}

export interface CategorySlice {
    category: string;
    amount: number;
    count: number;
}

export interface EventBudgetRow {
    eventId: string;
    title: string;
    budgetTarget: number;
    spent: number;
    remaining: number;
    utilization: number;
}

export interface ReportsData {
    cashFlow: CashFlowPoint[];
    donationCategories: CategorySlice[];
    expenseCategories: CategorySlice[];
    incomePaymentModes: { mode: string; amount: number }[];
    expensePaymentModes: { mode: string; amount: number }[];
    eventBudgets: EventBudgetRow[];
    totals: {
        totalDonations: number;
        totalApprovedExpenses: number;
        balance: number;
        donationCount: number;
        approvedExpenseCount: number;
        eventCount: number;
    };
}

/**
 * Aggregate analytics used to render the Reports dashboard with charts.
 * Gated by "finance:read" (ADMIN, TREASURER, COMMITTEE_MEMBER).
 */
export async function getReportsData(
    organizationId: string,
    options?: { bucket?: TimeBucket }
): Promise<ReportsData> {
    await requirePermission(organizationId, "finance:read");

    const tenantPrisma = getTenantPrisma(organizationId);
    const bucket = options?.bucket || "daily";

    const org = await tenantPrisma.organization.findUnique({
        where: { id: organizationId },
        select: { openingBalance: true, budgetTarget: true },
    });

    const [
        donationCategoriesRaw,
        expenseCategoryBreakdown,
        incomePaymentRaw,
        expensePaymentRaw,
        eventRows,
    ] = await Promise.all([
        // Donation category breakdown (all active donations)
        tenantPrisma.donation.groupBy({
            by: ["category"],
            where: { isArchived: false },
            _sum: { amount: true },
            _count: { _all: true },
        }),
        // Expense category breakdown (only APPROVED, matching the ledger's spend definition)
        tenantPrisma.expense.groupBy({
            by: ["category"],
            where: { status: ExpenseStatus.APPROVED, isArchived: false },
            _sum: { amount: true },
            _count: { _all: true },
        }),
        // Donation payment mode totals
        tenantPrisma.donation.groupBy({
            by: ["paymentMode"],
            where: { isArchived: false },
            _sum: { amount: true },
        }),
        // Approved expense payment mode totals
        tenantPrisma.expense.groupBy({
            by: ["paymentMode"],
            where: { status: ExpenseStatus.APPROVED, isArchived: false },
            _sum: { amount: true },
        }),
        // Event budget utilization
        tenantPrisma.event.findMany({
            where: { isArchived: false },
            select: {
                id: true,
                title: true,
                budgetTarget: true,
                expenses: {
                    where: { status: ExpenseStatus.APPROVED, isArchived: false },
                    select: { amount: true },
                },
            },
        }),
    ]);

    // Build cash-flow time series from flat donation/expense rows
    const donations = await tenantPrisma.donation.findMany({
        where: { isArchived: false },
        select: { amount: true, receivedAt: true },
    });
    const expenses = await tenantPrisma.expense.findMany({
        where: { status: ExpenseStatus.APPROVED, isArchived: false },
        select: { amount: true, requestedAt: true },
    });

    const cashFlow = buildCashFlow(donations, expenses, bucket);

    const donationCategories = donationCategoriesRaw.map((d) => ({
        category: d.category.replace("_", " "),
        amount: Number(d._sum.amount || 0),
        count: d._count._all,
    }));

    const expenseCategories = expenseCategoryBreakdown.map((e) => ({
        category: e.category.replace("_", " "),
        amount: Number(e._sum.amount || 0),
        count: e._count._all,
    }));

    const incomePaymentModes = orderPaymentModes(
        incomePaymentRaw.map((p) => ({ mode: p.paymentMode, amount: Number(p._sum.amount || 0) }))
    );

    const expensePaymentModes = orderPaymentModes(
        expensePaymentRaw.map((p) => ({ mode: p.paymentMode, amount: Number(p._sum.amount || 0) }))
    );

    const eventBudgets: EventBudgetRow[] = eventRows.map((event) => {
        const spent = event.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const budgetTarget = Number(event.budgetTarget || 0);
        const remaining = Math.max(0, budgetTarget - spent);
        return {
            eventId: event.id,
            title: event.title,
            budgetTarget,
            spent,
            remaining,
            utilization: budgetTarget > 0 ? (spent / budgetTarget) * 100 : 0,
        };
    });

    const totalDonations = donationCategoriesRaw.reduce((sum, d) => sum + Number(d._sum.amount || 0), 0);
    const totalApprovedExpenses = expenseCategoryBreakdown.reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);

    return {
        cashFlow,
        donationCategories,
        expenseCategories,
        incomePaymentModes,
        expensePaymentModes,
        eventBudgets,
        totals: {
            totalDonations,
            totalApprovedExpenses,
            balance: totalDonations - totalApprovedExpenses,
            donationCount: donationCategoriesRaw.reduce((sum, d) => sum + d._count._all, 0),
            approvedExpenseCount: expenseCategoryBreakdown.reduce((sum, e) => sum + e._count._all, 0),
            eventCount: eventRows.length,
        },
    };
}

export function buildCashFlow(
    donations: { amount: unknown; receivedAt: Date }[],
    expenses: { amount: unknown; requestedAt: Date }[],
    bucket: TimeBucket
): CashFlowPoint[] {
    const map = new Map<string, CashFlowPoint>();

    const keyOf = (date: Date) => {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();
        if (bucket === "monthly") {
            const bucketDate = new Date(Date.UTC(year, month, 1));
            return {
                sortKey: `${year}-${String(month + 1).padStart(2, "0")}`,
                label: bucketDate.toLocaleDateString("en-IN", { timeZone: "UTC", year: "numeric", month: "short" }),
                chartLabel: bucketDate.toLocaleDateString("en-IN", { timeZone: "UTC", month: "short" }),
            };
        }
        if (bucket === "weekly") {
            const utcDate = new Date(Date.UTC(year, month, day));
            const mondayOffset = (utcDate.getUTCDay() + 6) % 7;
            utcDate.setUTCDate(utcDate.getUTCDate() - mondayOffset);
            const weekStart = utcDate.toISOString().slice(0, 10);
            const weekLabel = utcDate.toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
            return { sortKey: weekStart, label: `Week of ${weekLabel}`, chartLabel: weekLabel };
        }
        const bucketDate = new Date(Date.UTC(year, month, day));
        return {
            sortKey: bucketDate.toISOString().slice(0, 10),
            label: bucketDate.toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }),
            chartLabel: bucketDate.toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short" }),
        };
    };

    for (const d of donations) {
        const period = keyOf(d.receivedAt);
        const point = map.get(period.sortKey) || { ...period, income: 0, expense: 0, balance: 0 };
        point.income += Number(d.amount);
        map.set(period.sortKey, point);
    }
    for (const e of expenses) {
        const period = keyOf(e.requestedAt);
        const point = map.get(period.sortKey) || { ...period, income: 0, expense: 0, balance: 0 };
        point.expense += Number(e.amount);
        map.set(period.sortKey, point);
    }

    const points = Array.from(map.values()).map((p) => ({
        ...p,
        balance: Math.round(p.income - p.expense),
    }));

    points.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return points;
}

function orderPaymentModes(rows: { mode: string; amount: number }[]) {
    const order = [PaymentMode.CASH, PaymentMode.UPI, PaymentMode.BANK_TRANSFER];
    const raw = new Map(rows.map((r) => [r.mode, r.amount]));
    return order.map((mode) => ({ mode, amount: raw.get(mode) || 0 }));
}
