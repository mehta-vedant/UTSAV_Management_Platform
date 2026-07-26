"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOrganization, updateOrganization, endFestival, deleteOrganization } from "@/modules/core/organization.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { actionFailure } from "@/lib/action-response";
import { assertValidPrasadWindowConfig } from "@/lib/prasad-windows";
import { withAction, withActionNoReturn } from "@/lib/action";

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
    if (!session?.user?.id) return actionFailure(new Error("Please sign in to continue."));

    return withAction(async () => {
        const validatedData = CreateOrganizationSchema.parse(data);
        assertValidPrasadWindowConfig(toPrasadWindowConfig(validatedData));

        const Organization = await createOrganization({
            ...validatedData,
            startDate: validatedData.startDate ? new Date(validatedData.startDate) : new Date(),
            endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
            type: validatedData.type,
        }, session.user.id);

        return { slug: Organization.slug };
    });
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
    if (!session?.user?.id) return actionFailure(new Error("Please sign in to continue."));

    return withActionNoReturn(async () => {
        const { organizationId, ...updateData } = UpdateOrganizationSchema.parse(data);
        assertValidPrasadWindowConfig(toPrasadWindowConfig(updateData));

        await updateOrganization(organizationId, {
            ...updateData,
            startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
            endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
        });
    }, { paths: [{ path: "/[orgSlug]/dashboard", type: "layout" }] });
}

export async function endFestivalAction(organizationId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return actionFailure(new Error("Please sign in to continue."));

    const member = await prisma.organizationMember.findFirst({
        where: {
            organizationId,
            userId: session.user.id,
            role: "ADMIN",
            isArchived: false,
        },
    });
    if (!member) return actionFailure(new Error("Only an admin can end a festival."));

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { slug: true },
    });

    return withActionNoReturn(async () => {
        await endFestival(organizationId, member.id);
    }, { paths: [{ path: `/${organization?.slug}` }, { path: `/${organization?.slug}/dashboard`, type: "layout" }] });
}

export async function deleteOrganizationAction(organizationId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return actionFailure(new Error("Please sign in to continue."));

    const member = await prisma.organizationMember.findFirst({
        where: {
            organizationId,
            userId: session.user.id,
            role: "ADMIN",
            isArchived: false
        }
    });
    if (!member) return actionFailure(new Error("Only an admin can delete an organization."));

    return withActionNoReturn(async () => {
        await deleteOrganization(organizationId);
    }, { paths: [{ path: "/dashboard", type: "page" }] });
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
