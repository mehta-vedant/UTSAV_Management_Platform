import { prisma } from "@/lib/prisma";
import { getTenantPrisma, validateAccess } from "@/lib/access-control";
import { FinancialService } from "../finance/financial.service";
import { BhogStatus, OrganizationRole, Prisma } from "@prisma/client";
import { OrganizationFinancialService, OrganizationFinancialSummary } from "../festival/organization-financial.service";

export interface DashboardOverview {
    organization: {
        id: string;
        name: string;
        slug: string;
        startDate: Date;
        endDate: Date | null;
        status: "ACTIVE" | "ENDED";
        timezone: string;
        openingBalance: number | null;
        publicFundraisingTarget: number | null;
        internalBudgetLimit: number | null;
        type: "FESTIVAL" | "CLUB";
    };
    financials: any; // Result from FinancialService.getOverview
    eventFinancials: OrganizationFinancialSummary;
    alerts: {
        pendingExpenses: number;
        pendingBhog: number;
        isOverspent: boolean;
        noTreasurer: boolean;
    };
    recentActivity: any[];
    stats: {
        volunteers: {
            total: number;
            unassigned: number;
        };
        bhog: {
            total: number;
            pending: number;
        };
        members: {
            total: number;
            byRole: Record<string, number>;
        };
        events: {
            total: number;
            upcoming: number;
        };
    };
}

export class OverviewService {
    static async getOrganizationOverview(organizationId: string): Promise<DashboardOverview> {
        const { member } = await validateAccess(organizationId);
        const tenantPrisma = getTenantPrisma(organizationId);

        const managementRoles: OrganizationRole[] = [
            OrganizationRole.ADMIN,
            OrganizationRole.TREASURER,
            OrganizationRole.COMMITTEE_MEMBER
        ];
        const canViewFinancials = managementRoles.includes(member.role);

        // Fetch non-sensitive data in parallel
        const [
            organization,
            recentActivity,
            volunteerCount,
            unassignedVolunteerCount,
            bhogCount,
            memberStats,
            eventStats,
        ] = await Promise.all([
            prisma.organization.findUnique({
                where: { id: organizationId },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                    prasadMorningStart: true,
                    prasadMorningEnd: true,
                    prasadEveningStart: true,
                    prasadEveningEnd: true,
                    timezone: true,
                    openingBalance: true,
                    publicFundraisingTarget: true,
                    internalBudgetLimit: true,
                    budgetTarget: true,
                    type: true
                }
            }),
            FinancialService.getRecentActivity(organizationId),
            tenantPrisma.organizationMember.count({
                where: { role: OrganizationRole.VOLUNTEER, isArchived: false }
            }),
            tenantPrisma.organizationMember.count({
                where: {
                    role: OrganizationRole.VOLUNTEER,
                    isArchived: false,
                    assignedTasks: { none: {} }
                }
            }),
            tenantPrisma.bhogItem.count({
                where: { isArchived: false }
            }),
            tenantPrisma.organizationMember.findMany({
                where: { isArchived: false },
                select: { role: true }
            }),
            tenantPrisma.event.findMany({
                where: { isArchived: false },
                select: { startTime: true }
            }),
        ]);

        if (!organization) throw new Error("Organization not found");

        // Conditionally fetch sensitive data
        let financials = {
            totalDonations: 0,
            totalDonationCount: 0,
            totalExpenses: 0,
            approvedExpenseCount: 0,
            totalPendingExpenses: 0,
            pendingExpenseCount: 0,
            pendingBhogCount: 0,
            remainingBalance: 0,
            openingBalance: 0,
            utilizationRate: 0,
            isOverspent: false,
            collectionProgress: 0,
        };

        let eventFinancials: OrganizationFinancialSummary = {
            totalSpent: new Prisma.Decimal(0),
            organizationSpent: new Prisma.Decimal(0),
            eventSpent: new Prisma.Decimal(0),
            eventBreakdown: []
        };

        if (canViewFinancials) {
            [financials, eventFinancials] = await Promise.all([
                FinancialService.getOrganizationFinancialOverview(organizationId),
                OrganizationFinancialService.getOrganizationSummary(organizationId)
            ]);
        }

        const hasTreasurer = memberStats.some((m: any) => m.role === OrganizationRole.TREASURER);

        const rolesCount = memberStats.reduce((acc: Record<string, number>, curr: any) => {
            acc[curr.role] = (acc[curr.role] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            organization: {
                ...organization,
                openingBalance: organization.openingBalance
                    ? Number(organization.openingBalance)
                    : organization.budgetTarget
                        ? Number(organization.budgetTarget)
                        : null,
                publicFundraisingTarget: organization.publicFundraisingTarget ? Number(organization.publicFundraisingTarget) : null,
                internalBudgetLimit: organization.internalBudgetLimit ? Number(organization.internalBudgetLimit) : null,
            },
            financials,
            eventFinancials,
            alerts: {
                pendingExpenses: financials.pendingExpenseCount,
                pendingBhog: financials.pendingBhogCount,
                isOverspent: financials.isOverspent,
                noTreasurer: !hasTreasurer
            },
            recentActivity,
            stats: {
                volunteers: {
                    total: volunteerCount,
                    unassigned: unassignedVolunteerCount
                },
                bhog: {
                    total: bhogCount,
                    pending: financials.pendingBhogCount
                },
                members: {
                    total: memberStats.filter((m: any) => m.role !== OrganizationRole.VOLUNTEER).length,
                    byRole: rolesCount
                },
                events: {
                    total: eventStats.length,
                    upcoming: eventStats.filter((e: any) => e.startTime > new Date()).length
                }
            }
        };
    }
}
