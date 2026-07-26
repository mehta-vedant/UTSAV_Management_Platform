import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantPrisma } from "@/lib/access-control";
import { OrganizationRole } from "@prisma/client";
import { AuthenticationError, NotFoundAppError, AuthorizationError } from "@/lib/errors";

export interface TenantContext {
    user: {
        id: string;
        email: string;
        name?: string | null;
    };
    member: {
        id: string;
        role: OrganizationRole;
        userId: string | null;
    };
    organization: {
        id: string;
        slug: string;
        name: string;
        type: string;
        status: string;
    };
    prisma: ReturnType<typeof getTenantPrisma>;
}

/**
 * Resolves the full tenant context from an org slug.
 * Wrapped in React's cache() to deduplicate within a single request.
 * Call this once per request — all subsequent calls with the same slug return cached data.
 */
export const getTenantContext = cache(async (orgSlug: string): Promise<TenantContext> => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        throw new AuthenticationError();
    }

    const organization = await prisma.organization.findUnique({
        where: { slug: orgSlug },
        select: {
            id: true,
            slug: true,
            name: true,
            type: true,
            status: true,
        },
    });

    if (!organization) {
        throw new NotFoundAppError("Organization not found.");
    }

    const emailFilter = session.user.email
        ? [{ email: session.user.email }]
        : [];

    const member = await prisma.organizationMember.findFirst({
        where: {
            organizationId: organization.id,
            OR: [
                { userId: session.user.id },
                ...emailFilter,
            ],
            isArchived: false,
        },
        select: {
            id: true,
            role: true,
            userId: true,
        },
    });

    if (!member) {
        throw new AuthorizationError("You are not a member of this organization.");
    }

    return {
        user: session.user as TenantContext["user"],
        member,
        organization,
        prisma: getTenantPrisma(organization.id),
    };
});

/**
 * Lightweight org resolution — only fetches organization data, no auth check.
 * Used by public pages and layout pre-rendering.
 */
export const getOrganizationBySlug = cache(async (orgSlug: string) => {
    const organization = await prisma.organization.findUnique({
        where: { slug: orgSlug },
        select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            budgetTarget: true,
            openingBalance: true,
            publicFundraisingTarget: true,
            internalBudgetLimit: true,
            status: true,
            prasadMorningStart: true,
            prasadMorningEnd: true,
            prasadEveningStart: true,
            prasadEveningEnd: true,
            timezone: true,
            startDate: true,
            endDate: true,
            endedAt: true,
            endedById: true,
            type: true,
        },
    });

    if (!organization) {
        throw new NotFoundAppError("Organization not found.");
    }

    return organization;
});
