"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateAccess, requirePermission, getTenantPrisma } from "@/lib/access-control";
import { OrganizationRole } from "@prisma/client";
import { sendInvitationEmail } from "@/lib/email";
import { inviteMember } from "@/modules/core/invitation.service";
import { actionFailure } from "@/lib/action-response";
import { withAction, withActionNoReturn } from "@/lib/action";

const InviteMemberSchema = z.object({
    organizationId: z.string(),
    email: z.string().email("Invalid email address"),
    role: z.nativeEnum(OrganizationRole),
    eventId: z.string().optional(),
    skipEmail: z.boolean().default(false),
});

export async function inviteMemberAction(data: z.infer<typeof InviteMemberSchema>) {
    const { user, member } = await validateAccess(data.organizationId, [OrganizationRole.ADMIN]);
    if (!user) return actionFailure(new Error("Not authenticated"));

    return withActionNoReturn(async () => {
        const validated = InviteMemberSchema.parse(data);
        const normalizedEmail = validated.email.toLowerCase();

        const tenantPrisma = getTenantPrisma(validated.organizationId);

        const existing = await tenantPrisma.organizationMember.findFirst({
            where: {
                email: normalizedEmail,
                isArchived: false,
            }
        });
        if (existing) throw new Error("User is already a member of this Organization");

        const organization = await prisma.organization.findUnique({
            where: { id: validated.organizationId },
            select: { name: true }
        });
        if (!organization) throw new Error("Organization not found");

        await inviteMember({
            organizationId: validated.organizationId,
            email: normalizedEmail,
            role: validated.role,
            invitedById: member.id,
            eventId: validated.eventId,
            skipEmail: validated.skipEmail,
        });
    }, { paths: [{ path: "/[orgSlug]/dashboard/members", type: "page" }] });
}

export async function updateMemberRoleAction(
    organizationId: string,
    memberId: string,
    newRole: OrganizationRole
) {
    const { member: currentMember } = await validateAccess(organizationId, [OrganizationRole.ADMIN]);
    const tenantPrisma = getTenantPrisma(organizationId);

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
                return actionFailure(new Error("Critical Security Violation: This organization must have at least one administrator. You cannot change the role of the last admin. Promote another member to Admin first."));
            }
        }
    }

    return withActionNoReturn(async () => {
        await tenantPrisma.organizationMember.update({
            where: { id: memberId },
            data: { role: newRole }
        });
    }, { paths: [{ path: "/[orgSlug]/dashboard/members", type: "page" }] });
}

export async function archiveMemberAction(organizationId: string, memberId: string) {
    const { member: currentMember } = await validateAccess(organizationId, [OrganizationRole.ADMIN]);
    const tenantPrisma = getTenantPrisma(organizationId);

    const targetMember = await tenantPrisma.organizationMember.findUnique({
        where: { id: memberId },
        select: { role: true }
    });

    if (targetMember?.role === OrganizationRole.ADMIN) {
        const adminCount = await tenantPrisma.organizationMember.count({
            where: { role: OrganizationRole.ADMIN, isArchived: false }
        });

        if (adminCount <= 1) {
            return actionFailure(new Error("Critical Security Violation: You cannot remove the last administrator. Promote another member to Admin before archiving this account."));
        }
    }

    return withActionNoReturn(async () => {
        await tenantPrisma.organizationMember.update({
            where: { id: memberId },
            data: { isArchived: true }
        });
    }, { paths: [{ path: "/[orgSlug]/dashboard/members", type: "page" }] });
}

export async function revokeInvitationAction(organizationId: string, invitationId: string) {
    await validateAccess(organizationId, [OrganizationRole.ADMIN]);

    return withActionNoReturn(async () => {
        const tenantPrisma = getTenantPrisma(organizationId);
        await tenantPrisma.organizationInvitation.delete({
            where: { id: invitationId }
        });
    }, { paths: [{ path: "/[orgSlug]/dashboard/members", type: "page" }] });
}

export async function resetMemberPasswordAction(organizationId: string, memberId: string) {
    await requirePermission(organizationId, "members:manage");

    return withAction(async () => {
        const tenantPrisma = getTenantPrisma(organizationId);
        const member = await tenantPrisma.organizationMember.findUnique({
            where: { id: memberId },
            select: { userId: true, email: true },
        });
        if (!member) throw new Error("Member not found.");
        if (!member.userId) throw new Error("This member has no linked login account to reset.");

        const user = await prisma.user.findUnique({ where: { id: member.userId } });
        if (!user) throw new Error("The linked login account was not found.");

        const temporaryPassword = randomBytes(9).toString("base64url");
        const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        return { memberEmail: member.email, temporaryPassword };
    }, { paths: [{ path: "/[orgSlug]/dashboard/members", type: "page" }] });
}
