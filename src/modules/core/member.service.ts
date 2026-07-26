import { getTenantPrisma, validateAccess } from "@/lib/access-control";
import { OrganizationRole } from "@prisma/client";

export async function getOrganizationMembers(organizationId: string) {
    await validateAccess(organizationId, [
        OrganizationRole.ADMIN,
        OrganizationRole.COMMITTEE_MEMBER,
        OrganizationRole.TREASURER,
    ]);

    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.organizationMember.findMany({
        where: { isArchived: false },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                    image: true
                }
            }
        },
        orderBy: { role: "asc" }
    });
}
