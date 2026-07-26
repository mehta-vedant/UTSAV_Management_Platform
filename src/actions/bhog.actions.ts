"use server";

import { createBhogItem, updateBhogStatus, archiveBhog, updateBhogItem } from "@/modules/festival/bhog.service";
import { BhogOfferingWindow, BhogStatus } from "@prisma/client";
import { z } from "zod";
import { parseDateInput } from "@/lib/prasad-windows";
import { withActionNoReturn } from "@/lib/action";

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
    return withActionNoReturn(async () => {
        const validated = CreateBhogSchema.parse(data);
        await createBhogItem(validated.organizationId, {
            ...validated,
            offeringDate: parseDateInput(validated.offeringDate),
        });
    }, { paths: [{ path: "/[orgSlug]/dashboard/bhog", type: "page" }] });
}

export async function updateBhogStatusAction(organizationId: string, itemId: string, status: BhogStatus) {
    return withActionNoReturn(async () => {
        await updateBhogStatus(organizationId, itemId, status);
    }, { paths: [{ path: "/[orgSlug]/dashboard/bhog", type: "page" }] });
}

export async function archiveBhogAction(organizationId: string, itemId: string) {
    return withActionNoReturn(async () => {
        await archiveBhog(organizationId, itemId);
    }, { paths: [{ path: "/[orgSlug]/dashboard/bhog", type: "page" }] });
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
    return withActionNoReturn(async () => {
        const validated = UpdateBhogSchema.parse(data);
        const { organizationId, itemId, ...updateData } = validated;
        await updateBhogItem(organizationId, itemId, updateData);
    }, { paths: [{ path: "/[orgSlug]/dashboard/bhog", type: "page" }] });
}
