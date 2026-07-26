import { validateAccess, getTenantPrisma } from "@/lib/access-control";
import { OrganizationRole, BhogStatus, Prisma, BhogOfferingWindow } from "@prisma/client";
import { PageQuery, getPaginationArgs, paginate } from "@/lib/pagination";

/**
 * Create a new bhog item (Internal)
 */
export async function createBhogItem(
    organizationId: string,
    data: {
        name: string;
        quantity: string;
        sponsorName: string;
        offeringDate: Date;
        offeringWindow: BhogOfferingWindow;
        storage?: string;
    }
) {
    const { member } = await validateAccess(organizationId, [
        OrganizationRole.ADMIN,
        OrganizationRole.COMMITTEE_MEMBER,
        OrganizationRole.TREASURER,
    ]);

    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.bhogItem.create({
        data: {
            name: data.name,
            quantity: data.quantity,
            sponsorName: data.sponsorName,
            offeringDate: data.offeringDate,
            offeringWindow: data.offeringWindow,
            storage: data.storage,
            status: BhogStatus.PENDING,
            organizationId,
        }
    });
}

/**
 * Get all bhog items for moderation
 */
export async function getBhogItems(organizationId: string) {
    await validateAccess(organizationId, [
        OrganizationRole.ADMIN,
        OrganizationRole.COMMITTEE_MEMBER,
        OrganizationRole.TREASURER,
    ]);

    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.bhogItem.findMany({
        where: { isArchived: false },
        orderBy: { submittedAt: "desc" },
    });
}

export async function getPaginatedBhogItems(organizationId: string, query: PageQuery) {
    await validateAccess(organizationId, [
        OrganizationRole.ADMIN,
        OrganizationRole.COMMITTEE_MEMBER,
        OrganizationRole.TREASURER,
    ]);

    const tenantPrisma = getTenantPrisma(organizationId);
    const where: Prisma.BhogItemWhereInput = {
        isArchived: false,
        ...(query.status && isBhogStatus(query.status) ? { status: query.status } : {}),
        ...(query.search ? {
            OR: [
                { name: { contains: query.search, mode: "insensitive" } },
                { sponsorName: { contains: query.search, mode: "insensitive" } },
                { notes: { contains: query.search, mode: "insensitive" } },
            ],
        } : {}),
        ...(query.dateFrom || query.dateTo ? {
            offeringDate: {
                ...(query.dateFrom ? { gte: query.dateFrom } : {}),
                ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
        } : {}),
    };

    const [items, totalItems] = await Promise.all([
        tenantPrisma.bhogItem.findMany({
            where,
            ...getPaginationArgs(query),
            orderBy: [{ offeringDate: "asc" }, { submittedAt: "desc" }],
        }),
        tenantPrisma.bhogItem.count({ where }),
    ]);

    return paginate(items, totalItems, query);
}

/**
 * Update bhog item status
 */
export async function updateBhogStatus(organizationId: string, itemId: string, status: BhogStatus) {
    await validateAccess(organizationId, [
        OrganizationRole.ADMIN,
        OrganizationRole.COMMITTEE_MEMBER,
        OrganizationRole.TREASURER,
    ]);

    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.bhogItem.update({
        where: { id: itemId, organizationId },
        data: {
            status,
            ...(status === BhogStatus.PREPARED ? { preparedAt: new Date(), approvedAt: new Date() } : {}),
        },
    });
}

/**
 * Update bhog item details
 */
export async function updateBhogItem(
    organizationId: string,
    itemId: string,
    data: {
        name?: string;
        quantity?: string;
        sponsorName?: string;
        storage?: string;
        estimatedCost?: number | Prisma.Decimal;
        notes?: string;
    }
) {
    await validateAccess(organizationId, [
        OrganizationRole.ADMIN,
        OrganizationRole.TREASURER,
        OrganizationRole.COMMITTEE_MEMBER,
    ]);

    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.bhogItem.update({
        where: { id: itemId, organizationId },
        data: {
            ...data,
            estimatedCost: data.estimatedCost ? new Prisma.Decimal(data.estimatedCost.toString()) : undefined,
        },
    });
}

/**
 * Archive bhog item (Moderation)
 */
export async function archiveBhog(organizationId: string, itemId: string) {
    await validateAccess(organizationId, [OrganizationRole.ADMIN]);

    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.bhogItem.update({
        where: { id: itemId, organizationId },
        data: { isArchived: true, archivedAt: new Date() },
    });
}

function isBhogStatus(value: string): value is BhogStatus {
    return Object.values(BhogStatus).includes(value as BhogStatus);
}
