"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantPrisma } from "@/lib/access-control";
import { revalidatePath } from "next/cache";
import { BhogOfferingWindow, OrganizationStatus } from "@prisma/client";
import { isPrasadWindowAvailable, parseDateInput } from "@/lib/prasad-windows";

const SponsorBhogSchema = z.object({
    organizationId: z.string().min(1),
    name: z.string().min(2, "Item name must be at least 2 characters"),
    quantity: z.string().min(1, "Quantity is required"),
    sponsorName: z.string().min(2, "Your name must be at least 2 characters"),
    offeringDate: z.string().min(1, "Offering date is required"),
    offeringWindow: z.nativeEnum(BhogOfferingWindow),
});

export async function sponsorBhogAction(formData: z.infer<typeof SponsorBhogSchema>) {
    try {
        const validatedData = SponsorBhogSchema.parse(formData);

        const tenantPrisma = getTenantPrisma(validatedData.organizationId);
        const Organization = await prisma.organization.findUnique({
            where: { id: validatedData.organizationId },
            select: {
                slug: true,
                status: true,
                startDate: true,
                endDate: true,
                prasadMorningStart: true,
                prasadMorningEnd: true,
                prasadEveningStart: true,
                prasadEveningEnd: true,
            }
        });

        if (!Organization) return { error: "Festival not found." };
        if (Organization.status === OrganizationStatus.ENDED) {
            return { error: "This festival has ended. Prasad submissions are now closed." };
        }

        const offeringDate = parseDateInput(validatedData.offeringDate);
        const isAvailable = isPrasadWindowAvailable({
            selectedDate: offeringDate,
            window: validatedData.offeringWindow,
            festivalStartDate: Organization.startDate,
            festivalEndDate: Organization.endDate,
            status: Organization.status,
            config: {
                morningStart: Organization.prasadMorningStart,
                morningEnd: Organization.prasadMorningEnd,
                eveningStart: Organization.prasadEveningStart,
                eveningEnd: Organization.prasadEveningEnd,
            },
        });

        if (!isAvailable) {
            return { error: "This prasad window is no longer available. Please choose another date or window." };
        }

        await tenantPrisma.bhogItem.create({
            data: {
                organizationId: validatedData.organizationId,
                name: validatedData.name,
                quantity: validatedData.quantity,
                sponsorName: validatedData.sponsorName,
                offeringDate,
                offeringWindow: validatedData.offeringWindow,
                status: "PENDING",
            },
        });

        if (Organization) {
            revalidatePath(`/${Organization.slug}`);
        }

        return { success: true };
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message };
        }
        return { error: error.message || "Failed to submit bhog sponsorship" };
    }
}
