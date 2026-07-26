"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateAccess, getTenantPrisma } from "@/lib/access-control";
import { revalidatePath } from "next/cache";
import { OrganizationRole } from "@prisma/client";
import { sendInvitationEmail } from "@/lib/email";
import { inviteMember } from "@/modules/core/invitation.service";

const InviteMemberSchema = z.object({
    organizationId: z.string(),
    email: z.string().email("Invalid email address"),
    role: z.nativeEnum(OrganizationRole),
    eventId: z.string().optional(),
    skipEmail: z.boolean().default(false),
});

export async function inviteMemberAction(data: z.infer<typeof InviteMemberSchema>) {
    const { user, member } = await validateAccess(data.organizationId, [OrganizationRole.ADMIN]);

    if (!user) return { error: "Not authenticated" };

    try {
        const validated = InviteMemberSchema.parse(data);
        const normalizedEmail = validated.email.toLowerCase();

        const tenantPrisma = getTenantPrisma(validated.organizationId);

        // Check if already a member
        const existing = await tenantPrisma.organizationMember.findFirst({
            where: {
                email: normalizedEmail,
                isArchived: false,
            }
        });

        if (existing) return { error: "User is already a member of this Organization" };

        // Get organization name for the email
        const organization = await prisma.organization.findUnique({
            where: { id: validated.organizationId },
            select: { name: true }
        });

        if (!organization) return { error: "Organization not found" };

        // Use the new InvitationService for token-based invitation
        await inviteMember({
            organizationId: validated.organizationId,
            email: normalizedEmail,
            role: validated.role,
            invitedById: member.id,
            eventId: validated.eventId,
            skipEmail: validated.skipEmail,
        });

        revalidatePath(`/[orgSlug]/dashboard/members`, "page");
        return { success: true };
    } catch (error: any) {
        return { error: error.message || "Failed to invite member" };
    }
}

export async function updateMemberRoleAction(
    organizationId: string,
    memberId: string,
    newRole: OrganizationRole
) {
    const { member: currentMember } = await validateAccess(organizationId, [OrganizationRole.ADMIN]);
    const tenantPrisma = getTenantPrisma(organizationId);

    // Security: Last Admin Protection
    if (newRole !== OrganizationRole.ADMIN) {
        const targetMember = await tenantPrisma.organizationMember.findUnique({
            where: { id: memberId },
            select: { role: true }
        });

        if (targetMember?.role === OrganizationRole.ADMIN) {
            const adminCount = await tenantPrisma.organizationMember.count({
                where: { role: OrganizationRole.ADMIN, isArchived: false }
            });

            if (adminCount <= 1) {
                return {
                    error: "Critical Security Violation: This organization must have at least one administrator. You cannot change the role of the last admin. Promote another member to Admin first."
                };
            }
        }
    }

    await tenantPrisma.organizationMember.update({
        where: { id: memberId },
        data: { role: newRole }
    });

    revalidatePath(`/[orgSlug]/dashboard/members`, "page");
    return { success: true };
}

export async function archiveMemberAction(organizationId: string, memberId: string) {
    const { member: currentMember } = await validateAccess(organizationId, [OrganizationRole.ADMIN]);
    const tenantPrisma = getTenantPrisma(organizationId);

    // Security: Last Admin Protection
    const targetMember = await tenantPrisma.organizationMember.findUnique({
        where: { id: memberId },
        select: { role: true }
    });

    if (targetMember?.role === OrganizationRole.ADMIN) {
        const adminCount = await tenantPrisma.organizationMember.count({
            where: { role: OrganizationRole.ADMIN, isArchived: false }
        });

        if (adminCount <= 1) {
            return {
                error: "Critical Security Violation: You cannot remove the last administrator. Promote another member to Admin before archiving this account."
            };
        }
    }

    await tenantPrisma.organizationMember.update({
        where: { id: memberId },
        data: { isArchived: true }
    });

    revalidatePath(`/[orgSlug]/dashboard/members`, "page");
    return { success: true };
}

export async function revokeInvitationAction(organizationId: string, invitationId: string) {
    try {
        await validateAccess(organizationId, [OrganizationRole.ADMIN]);

        const tenantPrisma = getTenantPrisma(organizationId);

        await tenantPrisma.organizationInvitation.delete({
            where: { id: invitationId }
        });

        revalidatePath(`/[orgSlug]/dashboard/members`, "page");
        return { success: true };
    } catch (error: any) {
        return { error: error.message || "Failed to revoke invitation" };
    }
}


