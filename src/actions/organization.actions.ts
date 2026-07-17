"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { OrganizationService } from "@/modules/core/organization.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { actionFailure, actionSuccess } from "@/lib/action-response";
import { assertValidPrasadWindowConfig } from "@/lib/prasad-windows";

function toPrasadWindowConfig(data: {
    prasadMorningStart?: string;
    prasadMorningEnd?: string;
    prasadEveningStart?: string;
    prasadEveningEnd?: string;
}) {
    return {
        morningStart: data.prasadMorningStart,
        morningEnd: data.prasadMorningEnd,
        eveningStart: data.prasadEveningStart,
        eveningEnd: data.prasadEveningEnd,
    };
}

const CreateOrganizationSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    slug: z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    openingBalance: z.number().optional(),
    publicFundraisingTarget: z.number().optional(),
    internalBudgetLimit: z.number().optional(),
    prasadMorningStart: z.string().optional(),
    prasadMorningEnd: z.string().optional(),
    prasadEveningStart: z.string().optional(),
    prasadEveningEnd: z.string().optional(),
    timezone: z.string().optional(),
    type: z.enum(["FESTIVAL", "CLUB"]).default("FESTIVAL"),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export async function createOrganizationAction(data: CreateOrganizationInput) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return actionFailure(new Error("Please sign in to continue."));
    }

    try {
        const validatedData = CreateOrganizationSchema.parse(data);
        assertValidPrasadWindowConfig(toPrasadWindowConfig(validatedData));

        const Organization = await OrganizationService.createOrganization({
            ...validatedData,
            startDate: validatedData.startDate ? new Date(validatedData.startDate) : new Date(),
            endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
            type: validatedData.type,
        }, session.user.id);

        return {
            ok: true as const,
            success: true as const,
            slug: Organization.slug,
            data: { slug: Organization.slug },
        };
    } catch (error: any) {
        return actionFailure(error, "Failed to create organization.");
    }
}
const UpdateOrganizationSchema = z.object({
    organizationId: z.string(),
    name: z.string().min(3).optional(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    openingBalance: z.number().optional(),
    publicFundraisingTarget: z.number().optional(),
    internalBudgetLimit: z.number().optional(),
    prasadMorningStart: z.string().optional(),
    prasadMorningEnd: z.string().optional(),
    prasadEveningStart: z.string().optional(),
    prasadEveningEnd: z.string().optional(),
    timezone: z.string().optional(),
});

export async function updateOrganizationAction(data: z.infer<typeof UpdateOrganizationSchema>) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return actionFailure(new Error("Please sign in to continue."));
    }

    try {
        const { organizationId, ...updateData } = UpdateOrganizationSchema.parse(data);
        assertValidPrasadWindowConfig(toPrasadWindowConfig(updateData));

        await OrganizationService.updateOrganization(organizationId, {
            ...updateData,
            startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
            endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
        });

        revalidatePath(`/[orgSlug]/dashboard`, "layout");
        return actionSuccess();
    } catch (error: any) {
        return actionFailure(error, "Failed to update organization.");
    }
}

export async function endFestivalAction(organizationId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return actionFailure(new Error("Please sign in to continue."));

    try {
        const member = await prisma.organizationMember.findFirst({
            where: {
                organizationId,
                userId: session.user.id,
                role: "ADMIN",
                isArchived: false,
            },
        });

        if (!member) return actionFailure(new Error("Only an admin can end a festival."));

        const organization = await OrganizationService.endFestival(organizationId, member.id);
        revalidatePath(`/${organization.slug}`);
        revalidatePath(`/${organization.slug}/dashboard`, "layout");
        return actionSuccess();
    } catch (error: any) {
        return actionFailure(error, "Failed to end festival.");
    }
}

export async function deleteOrganizationAction(organizationId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return actionFailure(new Error("Please sign in to continue."));

    try {
        // Strict ADMIN check
        const member = await prisma.organizationMember.findFirst({
            where: {
                organizationId,
                userId: session.user.id,
                role: "ADMIN",
                isArchived: false
            }
        });

        if (!member) return actionFailure(new Error("Only an admin can delete an organization."));

        await OrganizationService.deleteOrganization(organizationId);

        revalidatePath("/dashboard", "page");
        return actionSuccess();
    } catch (error: any) {
        return actionFailure(error, "Failed to delete organization.");
    }
}

export async function getOrganizationCountAction() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return 0;

    const count = await prisma.organizationMember.count({
        where: {
            userId: session.user.id,
            role: "ADMIN",
            isArchived: false
        }
    });

    return count;
}
