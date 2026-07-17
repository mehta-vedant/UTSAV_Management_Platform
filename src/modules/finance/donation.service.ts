import { validateAccess, getTenantPrisma, requirePermission } from "@/lib/access-control";
import { DonationCategory, Prisma } from "@prisma/client";
import { AuditService } from "@/modules/core/audit.service";
import { ValidationAppError } from "@/lib/errors";
import { PageQuery, getPaginationArgs, paginate } from "@/lib/pagination";

/**
 * Enterprise-Grade Donation Service
 * Handles all donation-related business logic with strict isolation
 */
export class DonationService {
    /**
     * Securely create a new donation
     */
    static async createDonation(
        organizationId: string,
        data: {
            donorName: string;
            amount: number | Prisma.Decimal;
            category: DonationCategory;
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

        await AuditService.record({
            organizationId,
            actorMemberId: member.id,
            entityType: "Donation",
            entityId: donation.id,
            action: "create",
            after: {
                donorName,
                amount: amount.toString(),
                category: data.category,
            },
        });

        return donation;
    }

    /**
     * Get all active donations for a Organization
     */
    static async getDonations(
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

    static async getPaginatedDonations(organizationId: string, query: PageQuery) {
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

    /**
     * Get financial summary of donations (Aggregate)
     */
    static async getDonationSummary(organizationId: string) {
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
    static async updateDonation(
        organizationId: string,
        donationId: string,
        data: {
            donorName?: string;
            amount?: number | Prisma.Decimal;
            category?: DonationCategory;
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

        await AuditService.record({
            organizationId,
            actorMemberId: member.id,
            entityType: "Donation",
            entityId: donationId,
            action: "update",
            before: before ? { amount: before.amount.toString(), category: before.category } : undefined,
            after: { amount: donation.amount.toString(), category: donation.category },
        });

        return donation;
    }
    /**
     * Archive (soft-delete) a donation
     */
    static async archiveDonation(organizationId: string, donationId: string) {
        const { member } = await requirePermission(organizationId, "finance:update");

        const tenantPrisma = getTenantPrisma(organizationId);

        const donation = await tenantPrisma.donation.update({
            where: { id: donationId },
            data: { isArchived: true, archivedAt: new Date(), archivedById: member.id }
        });

        await AuditService.record({
            organizationId,
            actorMemberId: member.id,
            entityType: "Donation",
            entityId: donationId,
            action: "archive",
            after: { isArchived: true },
        });

        return donation;
    }
}

function isDonationCategory(value: string): value is DonationCategory {
    return Object.values(DonationCategory).includes(value as DonationCategory);
}
