import { getTenantPrisma } from "@/lib/access-control";
import { BhogStatus } from "@prisma/client";

export async function getPublicBhogList(organizationId: string) {
    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.bhogItem.findMany({
        where: { isArchived: false, status: BhogStatus.PREPARED },
        select: {
            id: true,
            name: true,
            quantity: true,
            sponsorName: true,
            status: true,
            offeringDate: true,
            offeringWindow: true,
            submittedAt: true,
        },
        orderBy: [
            { offeringDate: "asc" },
            { offeringWindow: "asc" },
            { createdAt: "asc" },
        ],
    });
}
