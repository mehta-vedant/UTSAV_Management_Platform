import { getTenantPrisma } from "@/lib/access-control";

/**
 * Public Bhog Service
 * NO authentication required.
 */
export class PublicBhogService {
    /**
     * Get public bhog list
     */
    static async getPublicBhogList(organizationId: string) {
        const tenantPrisma = getTenantPrisma(organizationId);

        return await tenantPrisma.bhogItem.findMany({
            where: { isArchived: false },
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
}
