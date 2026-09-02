import { getTenantPrisma } from "@/lib/access-control";

export async function getPublicDonations(organizationId: string, limit = 50) {
    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.donation.findMany({
        where: { isArchived: false },
        select: {
            id: true,
            donorName: true,
            amount: true,
            category: true,
            paymentMode: true,
            date: true,
        },
        orderBy: { date: "desc" },
        take: limit,
    });
}
