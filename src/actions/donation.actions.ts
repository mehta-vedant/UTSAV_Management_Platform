"use server";

import { z } from "zod";
import { createDonation, updateDonation, archiveDonation } from "@/modules/finance/donation.service";
import { DonationCategory, PaymentMode } from "@prisma/client";
import { withActionNoReturn } from "@/lib/action";

const RecordDonationSchema = z.object({
    organizationId: z.string(),
    donorName: z.string().min(1, "Name is required"),
    amount: z.number().gt(0, "Amount must be greater than zero"),
    category: z.nativeEnum(DonationCategory),
    paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
    receivedAt: z.string().datetime("Date and time received are required."),
    notes: z.string().optional(),
    eventId: z.string().optional(),
});

export async function recordDonationAction(data: z.infer<typeof RecordDonationSchema>) {
    return withActionNoReturn(async () => {
        const validated = RecordDonationSchema.parse(data);
        await createDonation(validated.organizationId, {
            ...validated,
            receivedAt: new Date(validated.receivedAt),
        });
    }, { paths: [{ path: "/[orgSlug]/dashboard/donations", type: "page" }, { path: "/", type: "layout" }] });
}

const UpdateDonationSchema = z.object({
    organizationId: z.string(),
    donationId: z.string(),
    donorName: z.string().min(1).optional(),
    amount: z.number().gt(0).optional(),
    category: z.nativeEnum(DonationCategory).optional(),
    paymentMode: z.nativeEnum(PaymentMode).optional(),
    notes: z.string().optional(),
    eventId: z.string().optional(),
});

export async function updateDonationAction(data: z.infer<typeof UpdateDonationSchema>) {
    return withActionNoReturn(async () => {
        const validated = UpdateDonationSchema.parse(data);
        const { organizationId, donationId, ...updateData } = validated;
        await updateDonation(organizationId, donationId, updateData);
    }, { paths: [{ path: "/[orgSlug]/dashboard/donations", type: "page" }] });
}

export async function archiveDonationAction(organizationId: string, donationId: string) {
    return withActionNoReturn(async () => {
        await archiveDonation(organizationId, donationId);
    }, { paths: [{ path: "/[orgSlug]/dashboard/donations", type: "page" }] });
}
