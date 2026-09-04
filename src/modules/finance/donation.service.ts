import { validateAccess, getTenantPrisma, requirePermission } from "@/lib/access-control";
import { DonationCategory, PaymentMode, Prisma } from "@prisma/client";
import { record as recordAudit } from "@/modules/core/audit.service";
import { ValidationAppError } from "@/lib/errors";
import { PageQuery, getPaginationArgs, paginate } from "@/lib/pagination";

/**
 * Securely create a new donation
 */
export async function createDonation(
    organizationId: string,
    data: {
        donorName: string;
        amount: number | Prisma.Decimal;
        category: DonationCategory;
        paymentMode?: PaymentMode;
        receivedAt?: Date;
        notes?: string;
        eventId?: string;
    }
) {
    // 1. Validate Access (ADMIN, TREASURER, COMMITTEE_MEMBER)
    const { member } = await requirePermission(organizationId, "finance:create");

    // 2. Business Logic: Validate input
    const donorName = data.donorName?.trim();
    if (!donorName) {
        throw new ValidationAppError("Donor name is required.");
    }
    if (donorName.length > 100) {
        throw new ValidationAppError("Donor name is too long. Use 100 characters or fewer.");
    }

    const amount = new Prisma.Decimal(data.amount.toString());
    if (amount.lte(0)) {
        throw new ValidationAppError("Amount must be greater than zero.");
    }

    // 3. Get isolated Prisma client
    const tenantPrisma = getTenantPrisma(organizationId);

    // 4. Create record 
    // Note: organizationId is automatically injected by getTenantPrisma extension
    const donation = await tenantPrisma.donation.create({
        data: {
            donorName: donorName,
            amount: amount,
            category: data.category,
            paymentMode: data.paymentMode || PaymentMode.CASH,
            notes: data.notes,
            date: data.receivedAt || new Date(),
            receivedAt: data.receivedAt || new Date(),
            addedById: member.id,
            organizationId: organizationId, // Explicitly pass for type safety
            eventId: data.eventId,
        },
        include: {
            addedBy: {
                select: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            },
            event: {
                select: { title: true }
            }
        }
    });

    await recordAudit({
        organizationId,
        actorMemberId: member.id,
        entityType: "Donation",
        entityId: donation.id,
        action: "create",
        after: {
            donorName,
            amount: amount.toString(),
            category: data.category,
            paymentMode: data.paymentMode || PaymentMode.CASH,
        },
    });

    return donation;
}

/**
 * Get all active donations for a Organization
 */
export async function getDonations(
    organizationId: string,
    filters?: {
        category?: DonationCategory;
    }
) {
    // 1. Validate Access (ADMIN, TREASURER, COMMITTEE_MEMBER)
    await requirePermission(organizationId, "finance:read");

    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.donation.findMany({
        where: {
            isArchived: false,
            ...(filters?.category && { category: filters.category }),
        },
        orderBy: {
            receivedAt: "desc",
        },
        include: {
            addedBy: {
                select: {
                    user: { select: { name: true } }
                }
            },
            event: {
                select: { title: true }
            }
        }
    });
}

export async function getPaginatedDonations(organizationId: string, query: PageQuery) {
    await requirePermission(organizationId, "finance:read");

    const tenantPrisma = getTenantPrisma(organizationId);
    const where: Prisma.DonationWhereInput = {
        isArchived: false,
        ...(query.category && isDonationCategory(query.category) ? { category: query.category } : {}),
        ...(query.search ? {
            OR: [
                { donorName: { contains: query.search, mode: "insensitive" } },
                { notes: { contains: query.search, mode: "insensitive" } },
            ],
        } : {}),
        ...(query.dateFrom || query.dateTo ? {
            receivedAt: {
                ...(query.dateFrom ? { gte: query.dateFrom } : {}),
                ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
        } : {}),
    };

    const [items, totalItems] = await Promise.all([
        tenantPrisma.donation.findMany({
            where,
            ...getPaginationArgs(query),
            include: {
                addedBy: {
                    select: {
                        user: { select: { name: true } }
                    }
                },
                event: {
                    select: { title: true }
                }
            },
            orderBy: { receivedAt: "desc" },
        }),
        tenantPrisma.donation.count({ where }),
    ]);

    return paginate(items, totalItems, query);
}

export async function getDonationPaymentModeSummary(organizationId: string) {
    await requirePermission(organizationId, "finance:read");

    const tenantPrisma = getTenantPrisma(organizationId);

    const [aggregates, breakdown] = await Promise.all([
        tenantPrisma.donation.aggregate({
            where: { isArchived: false },
            _sum: { amount: true },
        }),
        tenantPrisma.donation.groupBy({
            by: ["paymentMode"],
            where: { isArchived: false },
            _sum: { amount: true },
        }),
    ]);

    const raw = Object.fromEntries(
        breakdown.map((b) => [b.paymentMode, Number(b._sum.amount || 0)])
    );

    return {
        total: Number(aggregates._sum.amount || 0),
        breakdown: {
            CASH: raw[PaymentMode.CASH] || 0,
            UPI: raw[PaymentMode.UPI] || 0,
            BANK_TRANSFER: raw[PaymentMode.BANK_TRANSFER] || 0,
        },
    };
}

/**
 * Get financial summary of donations (Aggregate)
 */
export async function getDonationSummary(organizationId: string) {
    // 1. Validate Access (ADMIN, TREASURER, COMMITTEE_MEMBER)
    await requirePermission(organizationId, "finance:read");

    const tenantPrisma = getTenantPrisma(organizationId);

    // Aggregate query
    const [aggregates, categoryBreakdown] = await Promise.all([
        tenantPrisma.donation.aggregate({
            where: { isArchived: false },
            _sum: { amount: true },
            _count: { _all: true },
        }),
        tenantPrisma.donation.groupBy({
            by: ["category"],
            where: { isArchived: false },
            _sum: { amount: true },
            _count: { _all: true },
        }),
    ]);

    return {
        totalAmount: aggregates._sum.amount || new Prisma.Decimal(0),
        totalCount: aggregates._count._all,
        categories: categoryBreakdown.map((item) => ({
            category: item.category,
            sum: item._sum.amount || new Prisma.Decimal(0),
            count: item._count._all,
        })),
    }

}

/**
 * Update an existing donation
 */
export async function updateDonation(
    organizationId: string,
    donationId: string,
    data: {
        donorName?: string;
        amount?: number | Prisma.Decimal;
        category?: DonationCategory;
        paymentMode?: PaymentMode;
        notes?: string;
        eventId?: string;
    }
) {
    const { member } = await requirePermission(organizationId, "finance:update");

    const tenantPrisma = getTenantPrisma(organizationId);

    const before = await tenantPrisma.donation.findUnique({ where: { id: donationId } });
    const donation = await tenantPrisma.donation.update({
        where: { id: donationId },
        data: {
            ...data,
            amount: data.amount ? new Prisma.Decimal(data.amount.toString()) : undefined,
        }
    });

    await recordAudit({
        organizationId,
        actorMemberId: member.id,
        entityType: "Donation",
        entityId: donationId,
        action: "update",
        before: before ? { amount: before.amount.toString(), category: before.category, paymentMode: before.paymentMode } : undefined,
        after: { amount: donation.amount.toString(), category: donation.category, paymentMode: donation.paymentMode },
    });

    return donation;
}

/**
 * Archive (soft-delete) a donation
 */
export async function archiveDonation(organizationId: string, donationId: string) {
    const { member } = await requirePermission(organizationId, "finance:update");

    const tenantPrisma = getTenantPrisma(organizationId);

    const donation = await tenantPrisma.donation.update({
        where: { id: donationId },
        data: { isArchived: true, archivedAt: new Date(), archivedById: member.id }
    });

    await recordAudit({
        organizationId,
        actorMemberId: member.id,
        entityType: "Donation",
        entityId: donationId,
        action: "archive",
        after: { isArchived: true },
    });

    return donation;
}

function isDonationCategory(value: string): value is DonationCategory {
    return Object.values(DonationCategory).includes(value as DonationCategory);
}

export interface DonationExportRow {
    id: string;
    donorName: string;
    amount: number;
    category: string;
    paymentMode: string;
    receivedAt: Date;
    notes: string | null;
    eventTitle: string | null;
    recordedBy: string | null;
}

export interface DonationExportSummary {
    totalAmount: number;
    count: number;
    byCategory: { category: string; amount: number; count: number }[];
    byPaymentMode: { paymentMode: string; amount: number; count: number }[];
}

export interface DonationExportData {
    rows: DonationExportRow[];
    summary: DonationExportSummary;
}

/**
 * Fetch every non-archived donation matching the active filters (ignores pagination)
 * so CSV/PDF exports capture the full filtered dataset.
 * Gated by "finance:read".
 */
export async function getDonationsForExport(organizationId: string, query: Partial<PageQuery> = {}): Promise<DonationExportData> {
    await requirePermission(organizationId, "finance:read");

    const tenantPrisma = getTenantPrisma(organizationId);

    const where: Prisma.DonationWhereInput = {
        isArchived: false,
        ...(query.category && isDonationCategory(query.category) ? { category: query.category } : {}),
        ...(query.search ? {
            OR: [
                { donorName: { contains: query.search, mode: "insensitive" } },
                { notes: { contains: query.search, mode: "insensitive" } },
            ],
        } : {}),
        ...(query.dateFrom || query.dateTo ? {
            receivedAt: {
                ...(query.dateFrom ? { gte: query.dateFrom } : {}),
                ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
        } : {}),
    };

    const donations = await tenantPrisma.donation.findMany({
        where,
        include: {
            addedBy: { select: { user: { select: { name: true } } } },
            event: { select: { title: true } },
        },
        orderBy: { receivedAt: "desc" },
    });

    const rows: DonationExportRow[] = donations.map((d) => ({
        id: d.id,
        donorName: d.donorName,
        amount: Number(d.amount),
        category: d.category.replace("_", " "),
        paymentMode: d.paymentMode.replace("_", " "),
        receivedAt: d.receivedAt,
        notes: d.notes || null,
        eventTitle: d.event?.title || null,
        recordedBy: d.addedBy?.user?.name || null,
    }));

    const categoryMap = new Map<string, { amount: number; count: number }>();
    const paymentModeMap = new Map<string, { amount: number; count: number }>();
    let totalAmount = 0;

    for (const r of rows) {
        totalAmount += r.amount;
        const c = categoryMap.get(r.category) || { amount: 0, count: 0 };
        c.amount += r.amount;
        c.count += 1;
        categoryMap.set(r.category, c);
        const p = paymentModeMap.get(r.paymentMode) || { amount: 0, count: 0 };
        p.amount += r.amount;
        p.count += 1;
        paymentModeMap.set(r.paymentMode, p);
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, v]) => ({
        category,
        amount: v.amount,
        count: v.count,
    }));
    const paymentModeBreakdown = Array.from(paymentModeMap.entries()).map(([paymentMode, v]) => ({
        paymentMode,
        amount: v.amount,
        count: v.count,
    }));

    return {
        rows,
        summary: {
            totalAmount,
            count: rows.length,
            byCategory: categoryBreakdown,
            byPaymentMode: paymentModeBreakdown,
        },
    };
}
