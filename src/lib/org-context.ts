import { validateAccess } from "@/lib/access-control";
import { getOrganizationBySlug } from "@/modules/core/organization.service";
import { OrganizationRole } from "@prisma/client";

export async function resolveOrgContext(orgSlug: string) {
    const organization = await getOrganizationBySlug(orgSlug);
    if (!organization) throw new Error("Organization not found");
    const { member } = await validateAccess(organization.id);
    const isAdmin = member.role === OrganizationRole.ADMIN || member.role === OrganizationRole.COMMITTEE_MEMBER;
    return { organization, member, isAdmin, isFestival: organization.type === "FESTIVAL" };
}
