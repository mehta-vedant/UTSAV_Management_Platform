import { requirePermission, getTenantPrisma } from "@/lib/access-control";
import { DonationCategory, ExpenseCategory, ExpenseStatus, PaymentMode, Prisma } from "@prisma/client";

export type TimeBucket = "daily" | "weekly" | "monthly";

export interface CashFlowPoint {
    label: string;
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

function buildCashFlow(
    donations: { amount: unknown; receivedAt: Date }[],
    expenses: { amount: unknown; requestedAt: Date }[],
    bucket: TimeBucket
): CashFlowPoint[] {
    const map = new Map<string, CashFlowPoint>();

    const keyOf = (date: Date) => {
        if (bucket === "monthly") {
            return date.toLocaleDateString("en-IN", { year: "numeric", month: "short" });
        }
        if (bucket === "weekly") {
            const week = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
            return date.toLocaleDateString("en-IN", { month: "short" }) + ` W${week}`;
        }
        return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    };

    for (const d of donations) {
        const key = keyOf(d.receivedAt);
        const point = map.get(key) || { label: key, income: 0, expense: 0, balance: 0 };
        point.income += Number(d.amount);
        map.set(key, point);
    }
    for (const e of expenses) {
        const key = keyOf(e.requestedAt);
        const point = map.get(key) || { label: key, income: 0, expense: 0, balance: 0 };
        point.expense += Number(e.amount);
        map.set(key, point);
    }

    const points = Array.from(map.values()).map((p) => ({
        ...p,
        balance: Math.round(p.income - p.expense),
    }));

    points.sort((a, b) => a.label.localeCompare(b.label, "en-IN"));
    return points;
}

function orderPaymentModes(rows: { mode: string; amount: number }[]) {
    const order = [PaymentMode.CASH, PaymentMode.UPI, PaymentMode.BANK_TRANSFER];
    const raw = new Map(rows.map((r) => [r.mode, r.amount]));
    return order.map((mode) => ({ mode, amount: raw.get(mode) || 0 }));
}