import { requirePermission, getTenantPrisma } from "@/lib/access-control";
import { DonationCategory, ExpenseCategory, ExpenseStatus, Prisma } from "@prisma/client";
import { PageQuery, getPaginationArgs } from "@/lib/pagination";

export type AuditTrailType = "INCOME" | "EXPENSE";

export interface AuditTrailEntry {
    id: string;
    type: AuditTrailType;
    title: string;
    detail: string | null;
    amount: number;
    date: Date;
    category: string;
    paymentMode: string | null;
    status: string | null;
    source: string;
    actor: string | null;
    eventTitle: string | null;
}

export interface InternalAuditTrailResult {
    items: AuditTrailEntry[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    totals: {
        income: number;
        expense: number;
        balance: number;
    };
}

/**
 * Fetch a unified, filterable, paginated ledger for admins/treasurers.
 * Unlike the public audit trail, this exposes full donor names and internal
 * expense detail (status, requested-by, approved-by) to authorized members.
 *
 * Gated by the "audit:read" permission (ADMIN + TREASURER).
 */
export async function getInternalAuditTrail(
    organizationId: string,
    query: PageQuery,
    options?: { type?: AuditTrailType }
): Promise<InternalAuditTrailResult> {
    await requirePermission(organizationId, "audit:read");

    const tenantPrisma = getTenantPrisma(organizationId);
    const type = options?.type;

    const search = query.search?.toLowerCase();

    const donationWhere: Prisma.DonationWhereInput = {
        isArchived: false,
        ...(type === "EXPENSE" ? { id: "none" } : {}),
        ...(search ? {
            OR: [
                { donorName: { contains: query.search, mode: "insensitive" } },
                { category: { equals: query.search as DonationCategory } },
                { notes: { contains: query.search, mode: "insensitive" } },
            ],
        } : {}),
        ...(query.category ? { category: query.category as DonationCategory } : {}),
        ...(query.dateFrom || query.dateTo ? {
            receivedAt: {
                ...(query.dateFrom ? { gte: query.dateFrom } : {}),
                ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
        } : {}),
    };

    const expenseWhere: Prisma.ExpenseWhereInput = {
        isArchived: false,
        ...(type === "INCOME" ? { id: "none" } : {}),
        ...(search ? {
            OR: [
                { title: { contains: query.search, mode: "insensitive" } },
                { category: { equals: query.search as ExpenseCategory } },
                { notes: { contains: query.search, mode: "insensitive" } },
            ],
        } : {}),
        ...(query.category ? { category: query.category as ExpenseCategory } : {}),
        ...(query.status && isExpenseStatus(query.status) ? { status: query.status } : {}),
        ...(query.dateFrom || query.dateTo ? {
            requestedAt: {
                ...(query.dateFrom ? { gte: query.dateFrom } : {}),
                ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
        } : {}),
    };

    const [donations, expenses] = await Promise.all([
        tenantPrisma.donation.findMany({
            where: donationWhere,
            select: {
                id: true,
                donorName: true,
                amount: true,
                category: true,
                paymentMode: true,
                receivedAt: true,
                notes: true,
                addedBy: { select: { user: { select: { name: true } } } },
            },
        }),
        tenantPrisma.expense.findMany({
            where: expenseWhere,
            select: {
                id: true,
                title: true,
                amount: true,
                category: true,
                paymentMode: true,
                status: true,
                requestedAt: true,
                approvedAt: true,
                notes: true,
                addedBy: { select: { user: { select: { name: true } } } },
                approvedBy: { select: { user: { select: { name: true } } } },
                event: { select: { title: true } },
            },
        }),
    ]);

    const incomeEntries: AuditTrailEntry[] = donations.map((d) => ({
        id: `d_${d.id}`,
        type: "INCOME" as const,
        title: `Donation: ${d.donorName}`,
        detail: d.notes || null,
        amount: Number(d.amount),
        date: d.receivedAt,
        category: d.category.replace("_", " "),
        paymentMode: d.paymentMode.replace("_", " "),
        status: null,
        source: d.donorName,
        actor: d.addedBy?.user?.name || null,
        eventTitle: null,
    }));

    const expenseEntries: AuditTrailEntry[] = expenses.map((e) => ({
        id: `e_${e.id}`,
        type: "EXPENSE" as const,
        title: e.title,
        detail: e.notes || null,
        amount: Number(e.amount),
        date: e.requestedAt,
        category: e.category.replace("_", " "),
        paymentMode: e.paymentMode.replace("_", " "),
        status: e.status,
        source: e.approvedBy?.user?.name || "Pending",
        actor: e.addedBy.user?.name || "System",
        eventTitle: e.event?.title || null,
    }));

    const merged = [...incomeEntries, ...expenseEntries].sort((a, b) => b.date.getTime() - a.date.getTime());

    const totalItems = merged.length;
    const { skip, take } = getPaginationArgs(query);

    const totals = {
        income: incomeEntries.reduce((sum, e) => sum + e.amount, 0),
        expense: expenseEntries.reduce((sum, e) => sum + e.amount, 0),
    };

    return {
        items: merged.slice(skip, skip + take),
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
        totals: {
            ...totals,
            balance: totals.income - totals.expense,
        },
    };
}

function isExpenseStatus(value: string): value is ExpenseStatus {
    return Object.values(ExpenseStatus).includes(value as ExpenseStatus);
}