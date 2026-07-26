import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getTenantPrisma } from "@/lib/access-control";
import { sendInvitationEmail } from "@/lib/email";
import { OrganizationRole } from "@prisma/client";

export async function inviteMember({
    organizationId,
    email,
    role,
    invitedById,
    eventId,
    skipEmail,
}: {
    organizationId: string;
    email: string;
    role: OrganizationRole;
    invitedById: string;
    eventId?: string;
    skipEmail?: boolean;
}) {
    // 1. Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    // 2. Set expiry (48 hours)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // 3. Create invitation record
    const tenantPrisma = getTenantPrisma(organizationId);
    const invitation = await tenantPrisma.organizationInvitation.create({
        data: {
            organizationId, // satisfy TS
            email,
            role,
            token,
            expiresAt,
            invitedById,
            eventId,
        },
        include: {
            organization: true,
        },
    });

    // 4. Create invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/accept-invite?token=${token}`;

    // 5. Send email (optional)
    let emailSent = false;
    let emailError = undefined;

    if (!skipEmail) {
        const emailResult = await sendInvitationEmail(
            email,
            inviteLink,
            invitation.organization.name
        );
        emailSent = !emailResult.error;
        emailError = emailResult.error;
    }

    return {
        invitation,
        emailSent,
        emailError,
        inviteLink // Return for immediate use if needed
    };
}
