import { ExpenseStatus, Prisma } from "@prisma/client";
import { getTenantPrisma, requirePermission } from "@/lib/access-control";
import { generateGeminiText } from "@/lib/gemini";

export interface BudgetScenario {
    name: "Cautious" | "Expected" | "Ambitious";
    projectedDonations: number;
    projectedExpenses: number;
    projectedBalance: number;
    assumption: string;
}

export interface BudgetHealthReport {
    approvedDonations: number;
    approvedExpenses: number;
    pendingCommitments: number;
    availableBalance: number;
    daysRemaining: number | null;
    recentDailySpend: number;
    categoryUsage: { category: string; amount: number; percentage: number }[];
    eventSpend: { eventId: string; title: string; amount: number; budgetTarget: number | null }[];
    scenarios: BudgetScenario[];
    risks: string[];
    limitation: string | null;
}

function amount(value: Prisma.Decimal | null | undefined) {
    return Number(value || 0);
}

export async function getBudgetHealthReport(organizationId: string): Promise<BudgetHealthReport> {
    await requirePermission(organizationId, "finance:read");
    const tenantPrisma = getTenantPrisma(organizationId);
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [organization, donationAggregate, expenseAggregate, pendingAggregate, categories, events, recentExpenses] = await Promise.all([
        tenantPrisma.organization.findUnique({
            where: { id: organizationId },
            select: { endDate: true, budgetTarget: true, openingBalance: true, publicFundraisingTarget: true },
        }),
        tenantPrisma.donation.aggregate({ where: { isArchived: false }, _sum: { amount: true } }),
        tenantPrisma.expense.aggregate({ where: { isArchived: false, status: ExpenseStatus.APPROVED }, _sum: { amount: true } }),
        tenantPrisma.expense.aggregate({ where: { isArchived: false, status: ExpenseStatus.PENDING }, _sum: { amount: true } }),
        tenantPrisma.expense.groupBy({ by: ["category"], where: { isArchived: false, status: ExpenseStatus.APPROVED }, _sum: { amount: true } }),
        tenantPrisma.event.findMany({
            where: { isArchived: false },
            select: { id: true, title: true, budgetTarget: true, expenses: { where: { isArchived: false, status: ExpenseStatus.APPROVED }, select: { amount: true } } },
        }),
        tenantPrisma.expense.aggregate({ where: { isArchived: false, status: ExpenseStatus.APPROVED, requestedAt: { gte: since } }, _sum: { amount: true } }),
    ]);

    const approvedDonations = amount(donationAggregate._sum.amount) + amount(organization?.openingBalance);
    const approvedExpenses = amount(expenseAggregate._sum.amount);
    const pendingCommitments = amount(pendingAggregate._sum.amount);
    const availableBalance = approvedDonations - approvedExpenses;
    const daysRemaining = organization?.endDate ? Math.max(0, Math.ceil((organization.endDate.getTime() - Date.now()) / 86_400_000)) : null;
    const recentDailySpend = amount(recentExpenses._sum.amount) / 30;
    const denominator = Math.max(approvedExpenses, 1);
    const categoryUsage = categories
        .map((item) => ({ category: item.category, amount: amount(item._sum.amount), percentage: (amount(item._sum.amount) / denominator) * 100 }))
        .sort((a, b) => b.amount - a.amount);
    const eventSpend = events.map((event) => ({
        eventId: event.id,
        title: event.title,
        amount: event.expenses.reduce((total, expense) => total + amount(expense.amount), 0),
        budgetTarget: event.budgetTarget ? amount(event.budgetTarget) : null,
    })).sort((a, b) => b.amount - a.amount);
    const forecastDays = daysRemaining ?? 30;
    const expectedFutureExpenses = recentDailySpend * forecastDays;
    const target = amount(organization?.publicFundraisingTarget);
    const donationGap = Math.max(0, target - approvedDonations);
    const scenarioInputs: Omit<BudgetScenario, "projectedBalance">[] = [
        { name: "Cautious", projectedDonations: approvedDonations + donationGap * 0.25, projectedExpenses: approvedExpenses + expectedFutureExpenses * 1.2 + pendingCommitments, assumption: "25% of the recorded fundraising gap arrives and spending runs 20% above the recent pace." },
        { name: "Expected", projectedDonations: approvedDonations + donationGap * 0.6, projectedExpenses: approvedExpenses + expectedFutureExpenses + pendingCommitments, assumption: "60% of the recorded fundraising gap arrives and spending continues at the recent 30-day pace." },
        { name: "Ambitious", projectedDonations: approvedDonations + donationGap, projectedExpenses: approvedExpenses + expectedFutureExpenses * 0.9 + pendingCommitments, assumption: "The recorded fundraising target is reached and spending is 10% below the recent pace." },
    ];
    const scenarios: BudgetScenario[] = scenarioInputs.map((scenario) => ({ ...scenario, projectedBalance: scenario.projectedDonations - scenario.projectedExpenses }));
    const risks: string[] = [];
    if (availableBalance - pendingCommitments < 0) risks.push(`Pending expense commitments exceed the currently available balance by Rs ${Math.abs(availableBalance - pendingCommitments).toLocaleString("en-IN")}.`);
    const highestEvent = eventSpend.find((event) => event.budgetTarget && event.amount > event.budgetTarget);
    if (highestEvent?.budgetTarget) risks.push(`${highestEvent.title} is above its recorded event budget by Rs ${(highestEvent.amount - highestEvent.budgetTarget).toLocaleString("en-IN")}.`);
    const highestCategory = categoryUsage[0];
    if (highestCategory && highestCategory.percentage >= 50) risks.push(`${highestCategory.category.replaceAll("_", " ")} represents ${highestCategory.percentage.toFixed(1)}% of approved spending.`);
    if (!risks.length) risks.push("No immediate deterministic budget risk was detected from the recorded approved and pending data.");

    return {
        approvedDonations,
        approvedExpenses,
        pendingCommitments,
        availableBalance,
        daysRemaining,
        recentDailySpend,
        categoryUsage,
        eventSpend,
        scenarios,
        risks,
        limitation: approvedExpenses === 0 || daysRemaining === null ? "There is limited history or no organization end date, so these are simple scenarios rather than a reliable forecast." : null,
    };
}

export async function explainBudgetHealth(organizationId: string) {
    const report = await getBudgetHealthReport(organizationId);
    const fallback = `Available balance is Rs ${report.availableBalance.toLocaleString("en-IN")}. Pending commitments are Rs ${report.pendingCommitments.toLocaleString("en-IN")}. ${report.risks[0]}`;
    const prompt = [
        "You are UTSAV's read-only budget explainer.",
        "Explain only the provided facts in simple English. Do not provide financial advice, invent data, make promises, or instruct the user to change records.",
        "State this is a scenario, not a prediction. Keep it under 140 words.",
        JSON.stringify(report),
    ].join("\n\n");
    try {
        return { report, explanation: (await generateGeminiText(prompt)) || fallback };
    } catch {
        return { report, explanation: fallback };
    }
}
