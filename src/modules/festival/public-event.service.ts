import { getTenantPrisma } from "@/lib/access-control";

export async function getPublicEvents(organizationId: string) {
    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.event.findMany({
        where: { isArchived: false },
        select: {
            id: true,
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            location: true,
        },
        orderBy: { startTime: "asc" },
    });
}
