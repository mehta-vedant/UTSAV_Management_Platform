import { getTenantPrisma, requirePermission } from "@/lib/access-control";
import { ExpenseCategory, ExpenseStatus, Prisma } from "@prisma/client";
import { record as recordAudit } from "@/modules/core/audit.service";
import { ConflictAppError, ValidationAppError } from "@/lib/errors";
import { PageQuery, getPaginationArgs, paginate } from "@/lib/pagination";

/**
 * Create a new expense request
 * Roles: ADMIN, COMMITTEE_MEMBER
 */
export async function createExpense(
    organizationId: string,
    data: {
        title: string;
        amount: number | Prisma.Decimal;
        category: ExpenseCategory;
        notes?: string;
        eventId?: string;
        requestedAt?: Date;
    }
) {
    // 1. Validate Access
    const { member } = await requirePermission(organizationId, "finance:create");

    // 2. Business Logic: Validate input
    const title = data.title?.trim();
    if (!title) {
        throw new ValidationAppError("Expense title is required.");
    }
    if (title.length > 200) {
        throw new ValidationAppError("Expense title is too long. Use 200 characters or fewer.");
    }

    const amount = new Prisma.Decimal(data.amount.toString());
    if (amount.lte(0)) {
        throw new ValidationAppError("Amount must be greater than zero.");
    }

    // 3. SECURE WRITE: organizationId is auto-injected by tenantPrisma extension
    const tenantPrisma = getTenantPrisma(organizationId);

    const expense = await tenantPrisma.expense.create({
        data: {
            title: title,
            amount: amount,
            category: data.category,
            notes: data.notes,
            status: ExpenseStatus.PENDING,
            requestedAt: data.requestedAt || new Date(),
            addedById: member.id,
            organizationId: organizationId,
            eventId: data.eventId,
        },
    });

    await recordAudit({
        organizationId,
        actorMemberId: member.id,
        entityType: "Expense",
        entityId: expense.id,
        action: "create",
        after: {
            title,
            amount: amount.toString(),
            category: data.category,
            status: ExpenseStatus.PENDING,
        },
    });

    return expense;
}

/**
 * Approve a PENDING expense
 * Role: TREASURER only
 */
export async function approveExpense(organizationId: string, expenseId: string) {
    // 1. Validate Access (ADMIN or TREASURER)
    const { member } = await requirePermission(organizationId, "finance:approve");

    const tenantPrisma = getTenantPrisma(organizationId);
    // ... existing updateMany logic ...

    // 2. Atomic SECURE UPDATE with Defensive Checks
    // We use updateMany to prevent race conditions (Only updates if status is still PENDING)
    const result = await tenantPrisma.expense.updateMany({
        where: {
            id: expenseId,
            organizationId: organizationId, // Redundant safety
            status: ExpenseStatus.PENDING,
            isArchived: false
        },
        data: {
            status: ExpenseStatus.APPROVED,
            approvedById: member.id,
            approvedAt: new Date(),
            processedAt: new Date(),
        },
    });

    if (result.count === 0) {
        throw new ConflictAppError("This expense was already processed.");
    }

    await recordAudit({
        organizationId,
        actorMemberId: member.id,
        entityType: "Expense",
        entityId: expenseId,
        action: "approve",
        after: { status: ExpenseStatus.APPROVED },
    });

    return { success: true };
}

/**
 * Reject a PENDING expense
 * Role: TREASURER only
 */
export async function rejectExpense(organizationId: string, expenseId: string) {
    // 1. Validate Access (ADMIN or TREASURER)
    const { member } = await requirePermission(organizationId, "finance:approve");

    const tenantPrisma = getTenantPrisma(organizationId);

    // 2. Atomic SECURE UPDATE with Defensive Checks
    const result = await tenantPrisma.expense.updateMany({
        where: {
            id: expenseId,
            organizationId: organizationId, // Redundant safety
            status: ExpenseStatus.PENDING,
            isArchived: false
        },
        data: {
            status: ExpenseStatus.REJECTED,
            approvedById: member.id,
            rejectedAt: new Date(),
            processedAt: new Date(),
        },
    });

    if (result.count === 0) {
        throw new ConflictAppError("This expense was already processed.");
    }

    await recordAudit({
        organizationId,
        actorMemberId: member.id,
        entityType: "Expense",
        entityId: expenseId,
        action: "reject",
        after: { status: ExpenseStatus.REJECTED },
    });

    return { success: true };
}

export async function getPaginatedExpenses(organizationId: string, query: PageQuery) {
    await requirePermission(organizationId, "finance:read");

    const tenantPrisma = getTenantPrisma(organizationId);
    const where: Prisma.ExpenseWhereInput = {
        isArchived: false,
        ...(query.status && isExpenseStatus(query.status) ? { status: query.status } : {}),
        ...(query.category && isExpenseCategory(query.category) ? { category: query.category } : {}),
        ...(query.search ? {
            OR: [
                { title: { contains: query.search, mode: "insensitive" } },
                { notes: { contains: query.search, mode: "insensitive" } },
            ],
        } : {}),
        ...(query.dateFrom || query.dateTo ? {
            requestedAt: {
                ...(query.dateFrom ? { gte: query.dateFrom } : {}),
                ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
        } : {}),
    };

    const [items, totalItems] = await Promise.all([
        tenantPrisma.expense.findMany({
            where,
            ...getPaginationArgs(query),
            include: {
                addedBy: {
                    select: { user: { select: { name: true } } }
                },
                event: {
                    select: { title: true, status: true }
                }
            },
            orderBy: { requestedAt: "desc" },
        }),
        tenantPrisma.expense.count({ where }),
    ]);

    return paginate(items, totalItems, query);
}

/**
 * Update an existing expense
 */
export async function updateExpense(
    organizationId: string,
    expenseId: string,
    data: {
        title?: string;
        amount?: number | Prisma.Decimal;
        category?: ExpenseCategory;
        notes?: string;
        eventId?: string;
    }
) {
    const { member } = await requirePermission(organizationId, "finance:update");

    const tenantPrisma = getTenantPrisma(organizationId);

    const before = await tenantPrisma.expense.findUnique({ where: { id: expenseId } });
    const expense = await tenantPrisma.expense.update({
        where: { id: expenseId },
        data: {
            ...data,
            amount: data.amount ? new Prisma.Decimal(data.amount.toString()) : undefined,
        }
    });

    await recordAudit({
        organizationId,
        actorMemberId: member.id,
        entityType: "Expense",
        entityId: expenseId,
        action: "update",
        before: before ? { amount: before.amount.toString(), status: before.status } : undefined,
        after: { amount: expense.amount.toString(), status: expense.status },
    });

    return expense;
}

/**
 * Comprehensive Financial Analysis of Expenses
 */
export async function getExpenseSummary(organizationId: string) {
    // 1. Validate Access (ADMIN, TREASURER, COMMITTEE_MEMBER)
    await requirePermission(organizationId, "finance:read");

    const tenantPrisma = getTenantPrisma(organizationId);

    // Multi-pass aggregation for categorical and status insights
    const [statusAggregates, categoryBreakdown] = await Promise.all([
        // 1. Group by status
        tenantPrisma.expense.groupBy({
            by: ["status"],
            where: { isArchived: false },
            _sum: { amount: true },
            _count: { _all: true },
        }),
        // 2. Breakdown APPROVED expenses by category
        tenantPrisma.expense.groupBy({
            by: ["category"],
            where: {
                status: ExpenseStatus.APPROVED,
                isArchived: false,
            },
            _sum: { amount: true },
        }),
    ]);

    // Format results for frontend consumption
    const summary = {
        approvedTotal: new Prisma.Decimal(0),
        pendingTotal: new Prisma.Decimal(0),
        statusCounts: {} as Record<string, number>,
        categoryBreakdown: categoryBreakdown.map(item => ({
            category: item.category,
            amount: item._sum.amount || new Prisma.Decimal(0),
        }))
    };

    statusAggregates.forEach(item => {
        summary.statusCounts[item.status] = item._count._all;
        if (item.status === ExpenseStatus.APPROVED) {
            summary.approvedTotal = item._sum.amount || new Prisma.Decimal(0);
        } else if (item.status === ExpenseStatus.PENDING) {
            summary.pendingTotal = item._sum.amount || new Prisma.Decimal(0);
        }
    });

    return summary;
}

/**
 * Archive (soft-delete) an expense
 */
export async function archiveExpense(organizationId: string, expenseId: string) {
    const { member } = await requirePermission(organizationId, "finance:update");

    const tenantPrisma = getTenantPrisma(organizationId);

    const expense = await tenantPrisma.expense.update({
        where: { id: expenseId },
        data: { isArchived: true, archivedAt: new Date(), archivedById: member.id }
    });

    await recordAudit({
        organizationId,
        actorMemberId: member.id,
        entityType: "Expense",
        entityId: expenseId,
        action: "archive",
        after: { isArchived: true },
    });

    return expense;
}

function isExpenseStatus(value: string): value is ExpenseStatus {
    return Object.values(ExpenseStatus).includes(value as ExpenseStatus);
}

function isExpenseCategory(value: string): value is ExpenseCategory {
    return Object.values(ExpenseCategory).includes(value as ExpenseCategory);
}
