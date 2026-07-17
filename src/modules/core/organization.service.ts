import { prisma } from "@/lib/prisma";
import { cache } from "react";

/**
 * Tenant Service
 * Handles slug resolution and basic Organization metadata fetching
 */
export class OrganizationService {
    /**
     * Resolve a orgSlug to its internal organizationId
     * Memoized per-request to avoid redundant database calls in Server Components
     */
    static getOrganizationBySlug = cache(async (slug: string) => {
        return await prisma.organization.findUnique({
            where: { slug },
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
    });


    /**
     * Get all Organizations a user is a member of
     */
    static async getUserOrganizations(userId: string) {
        return await prisma.organizationMember.findMany({
            where: {
                userId,
                isArchived: false,
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    slug: true,
                    createdAt: true,
                    timezone: true,
                    type: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    /**
     * Create a new Organization and assign the creator as ADMIN
     */
    static async createOrganization(data: {
        name: string;
        slug: string;
        description?: string;
        startDate: Date;
        endDate?: Date | null;
        openingBalance?: number;
        publicFundraisingTarget?: number;
        internalBudgetLimit?: number;
        prasadMorningStart?: string;
        prasadMorningEnd?: string;
        prasadEveningStart?: string;
        prasadEveningEnd?: string;
        timezone?: string;
        type: "FESTIVAL" | "CLUB";
    }, userId: string) {
        // Enforce 3-organization limit (as ADMIN)
        const activeCount = await prisma.organizationMember.count({
            where: {
                userId,
                role: "ADMIN",
                isArchived: false,
            }
        });

        if (activeCount >= 10) {
            throw new Error("You have reached the maximum limit of 10 organizations. Please delete one to create another.");
        }

        return await prisma.$transaction(async (tx) => {
            // 1. Create the Organization
            const Organization = await tx.organization.create({
                data: {
                    name: data.name,
                    slug: data.slug,
                    description: data.description,
                    startDate: data.startDate,
                    endDate: data.endDate || null,
                    openingBalance: data.openingBalance,
                    publicFundraisingTarget: data.publicFundraisingTarget,
                    internalBudgetLimit: data.internalBudgetLimit,
                    prasadMorningStart: data.prasadMorningStart,
                    prasadMorningEnd: data.prasadMorningEnd,
                    prasadEveningStart: data.prasadEveningStart,
                    prasadEveningEnd: data.prasadEveningEnd,
                    timezone: data.timezone || "Asia/Kolkata",
                    budgetTarget: data.openingBalance,
                    type: data.type,
                },
            });

            // 2. Assign the creator as ADMIN
            await tx.organizationMember.create({
                data: {
                    userId: userId,
                    email: (await tx.user.findUnique({ where: { id: userId } }))?.email || "",
                    organizationId: Organization.id,
                    role: "ADMIN",
                },
            });

            return Organization;
        });
    }

    /**
     * Update an existing Organization's metadata
     */
    static async updateOrganization(organizationId: string, data: {
        name?: string;
        description?: string;
        startDate?: Date;
        endDate?: Date | null;
        openingBalance?: number;
        publicFundraisingTarget?: number;
        internalBudgetLimit?: number;
        prasadMorningStart?: string;
        prasadMorningEnd?: string;
        prasadEveningStart?: string;
        prasadEveningEnd?: string;
        timezone?: string;
    }) {
        return await prisma.organization.update({
            where: { id: organizationId },
            data: {
                ...data,
                budgetTarget: data.openingBalance !== undefined ? data.openingBalance : undefined,
            },
        });
    }

    static async endFestival(organizationId: string, endedById?: string) {
        const now = new Date();
        return await prisma.organization.update({
            where: { id: organizationId },
            data: {
                status: "ENDED",
                endDate: now,
                endedAt: now,
                endedById,
            },
        });
    }
    /**
     * Delete an Organization permanently
     */
    static async deleteOrganization(organizationId: string) {
        return await prisma.$transaction(async (tx) => {
            // Note: In a real multi-tenant app, we might want to cascade delete 
            // or use soft-delete. Here we do a clean sweep.

            // 1. Delete Members
            await tx.organizationMember.deleteMany({
                where: { organizationId }
            });

            // 2. Delete Invitations
            await tx.organizationInvitation.deleteMany({
                where: { organizationId }
            });

            // 3. Delete the Organization itself
            return await tx.organization.delete({
                where: { id: organizationId }
            });
        });
    }
}
