"use server";

import { z } from "zod";
import { DonationService } from "@/modules/finance/donation.service";
import { DonationCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { actionFailure, actionSuccess } from "@/lib/action-response";

const RecordDonationSchema = z.object({
    organizationId: z.string(),
    donorName: z.string().min(1, "Name is required"),
    amount: z.number().gt(0, "Amount must be greater than zero"),
    category: z.nativeEnum(DonationCategory),
    notes: z.string().optional(),
});

export async function recordDonationAction(data: z.infer<typeof RecordDonationSchema>) {
    try {
        const validated = RecordDonationSchema.parse(data);
        await DonationService.createDonation(validated.organizationId, validated);

        revalidatePath(`/[orgSlug]/dashboard/donations`, "page");
        revalidatePath(`/`, "layout"); // Update total collection on landing if needed
        return actionSuccess();
    } catch (error: any) {
        return actionFailure(error, "Failed to record donation.");
    }
}
const UpdateDonationSchema = z.object({
    organizationId: z.string(),
    donationId: z.string(),
    donorName: z.string().min(1).optional(),
    amount: z.number().gt(0).optional(),
    category: z.nativeEnum(DonationCategory).optional(),
    notes: z.string().optional(),
});

export async function updateDonationAction(data: z.infer<typeof UpdateDonationSchema>) {
    try {
        const validated = UpdateDonationSchema.parse(data);
        const { organizationId, donationId, ...updateData } = validated;
        await DonationService.updateDonation(organizationId, donationId, updateData);

        revalidatePath(`/[orgSlug]/dashboard/donations`, "page");
        return actionSuccess();
    } catch (error: any) {
        return actionFailure(error, "Failed to update donation.");
    }
}

export async function archiveDonationAction(organizationId: string, donationId: string) {
    try {
        await DonationService.archiveDonation(organizationId, donationId);
        revalidatePath(`/[orgSlug]/dashboard/donations`, "page");
        return actionSuccess();
    } catch (error: any) {
        return actionFailure(error, "Failed to archive donation.");
    }
}
