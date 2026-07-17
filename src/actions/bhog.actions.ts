"use server";

import { BhogService } from "@/modules/festival/bhog.service";
import { BhogOfferingWindow, BhogStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseDateInput } from "@/lib/prasad-windows";

const CreateBhogSchema = z.object({
    organizationId: z.string(),
    name: z.string().min(1, "Item name is required"),
    quantity: z.string().min(1, "Quantity is required"),
    sponsorName: z.string().min(1, "Sponsor name is required"),
    offeringDate: z.string().min(1, "Offering date is required"),
    offeringWindow: z.nativeEnum(BhogOfferingWindow),
    storage: z.string().optional(),
});

export async function createBhogAction(data: z.infer<typeof CreateBhogSchema>) {
    try {
        const validated = CreateBhogSchema.parse(data);
        await BhogService.createBhogItem(validated.organizationId, {
            ...validated,
            offeringDate: parseDateInput(validated.offeringDate),
        });
        revalidatePath(`/[orgSlug]/dashboard/bhog`, "page");
        return { success: true };
    } catch (error: any) {
        return { error: error.message || "Failed to create bhog item" };
    }
}

export async function updateBhogStatusAction(organizationId: string, itemId: string, status: BhogStatus) {
    try {
        await BhogService.updateBhogStatus(organizationId, itemId, status);
        revalidatePath(`/[orgSlug]/dashboard/bhog`, "page");
        return { success: true };
    } catch (error: any) {
        return { error: error.message || "Failed to update bhog status" };
    }
}

export async function archiveBhogAction(organizationId: string, itemId: string) {
    try {
        await BhogService.archiveBhog(organizationId, itemId);
        revalidatePath(`/[orgSlug]/dashboard/bhog`, "page");
        return { success: true };
    } catch (error: any) {
        return { error: error.message || "Failed to archive bhog item" };
    }
}
const UpdateBhogSchema = z.object({
    organizationId: z.string(),
    itemId: z.string(),
    name: z.string().min(1).optional(),
    quantity: z.string().min(1).optional(),
    sponsorName: z.string().min(1).optional(),
    storage: z.string().optional(),
    estimatedCost: z.number().optional(),
    notes: z.string().optional(),
});

export async function updateBhogItemAction(data: z.infer<typeof UpdateBhogSchema>) {
    try {
        const validated = UpdateBhogSchema.parse(data);
        const { organizationId, itemId, ...updateData } = validated;
        await BhogService.updateBhogItem(organizationId, itemId, updateData);
        revalidatePath(`/[orgSlug]/dashboard/bhog`, "page");
        return { success: true };
    } catch (error: any) {
        return { error: error.message || "Failed to update bhog item" };
    }
}
