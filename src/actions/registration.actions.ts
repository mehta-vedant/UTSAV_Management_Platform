"use server";

import { revalidatePath } from "next/cache";
import { getTenantPrisma, validateAccess } from "@/lib/access-control";
import { OrganizationRole } from "@prisma/client";

/**
 * Toggle attendance for a registration
 */
export async function toggleAttendanceAction(
    organizationId: string,
    orgSlug: string,
    eventId: string,
    registrationId: string,
    attended: boolean
) {
    try {
        await validateAccess(organizationId, [
            OrganizationRole.ADMIN,
            OrganizationRole.COMMITTEE_MEMBER,
        ]);

        const tenantPrisma = getTenantPrisma(organizationId);
        const event = await tenantPrisma.event.findFirst({ where: { id: eventId, isArchived: false }, select: { id: true } });
        if (!event) throw new Error("This event could not be found for this organization.");

        const updated = await tenantPrisma.eventRegistration.updateMany({
            where: { id: registrationId, eventId, organizationId },
            data: { attended }
        });
        if (updated.count === 0) throw new Error("Registration could not be found for this organization.");

        revalidatePath(`/${orgSlug}/dashboard/events/${eventId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Failed to toggle attendance:", error);
        return { error: error.message || "Failed to update attendance" };
    }
}

/**
 * Manually add a registration (walk-in)
 */
export async function addManualRegistrationAction(
    organizationId: string,
    orgSlug: string,
    eventId: string,
    input: { name: string; email: string; phone?: string; notes?: string }
) {
    try {
        await validateAccess(organizationId, [
            OrganizationRole.ADMIN,
            OrganizationRole.COMMITTEE_MEMBER,
        ]);

        const tenantPrisma = getTenantPrisma(organizationId);
        const event = await tenantPrisma.event.findFirst({ where: { id: eventId, isArchived: false }, select: { id: true } });
        if (!event) throw new Error("This event could not be found for this organization.");

        await tenantPrisma.eventRegistration.create({
            data: {
                ...input,
                eventId,
                organizationId,
            }
        });

        revalidatePath(`/${orgSlug}/dashboard/events/${eventId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Failed to add registration:", error);
        return { error: error.message || "Failed to add registration" };
    }
}
