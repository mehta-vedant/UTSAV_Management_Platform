import { OverviewService } from "@/modules/core/overview.service";
import { prisma } from "@/lib/prisma";
import { validateAccess } from "@/lib/access-control";
import DashboardHeader from "@/components/dashboard/overview/DashboardHeader";
import StatCard from "@/components/dashboard/overview/StatCard";
import AlertBox from "@/components/dashboard/overview/AlertBox";
import ActionRow from "@/components/dashboard/overview/ActionRow";
import MiniWidget from "@/components/dashboard/overview/MiniWidget";
import EventFinancialBreakdown from "@/components/dashboard/overview/EventFinancialBreakdown";
import {
    IndianRupee,
    TrendingUp,
    Clock,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    Users,
    Utensils,
    PieChart,
    Shield
} from "lucide-react";
import { OrganizationRole } from "@prisma/client";
import EditOrganizationModal from "@/components/dashboard/organization/EditOrganizationModal";
import { cn } from "@/lib/utils";

export default async function DashboardOverviewPage({
    params,
}: {
    params: { orgSlug: string };
}) {
    const { orgSlug } = params;

    const organization = await prisma.organization.findUnique({
        where: { slug: orgSlug },
    });

    if (!organization) return <div>Organization not found</div>;

    const { member } = await validateAccess(organization.id);
    const data = await OverviewService.getOrganizationOverview(organization.id);

    const financials = data.financials;
    const isFestival = organization.type === "FESTIVAL";
    return (
        <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 1️⃣ Organization Identity Header */}
            <div className="flex items-center justify-between">
                <DashboardHeader
                    organization={data.organization as any}
                    role={member.role}
                />
                {(member.role === OrganizationRole.ADMIN || member.role === OrganizationRole.TREASURER) && (
                    <EditOrganizationModal
                        organization={data.organization as any}
                        trigger={
                            <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                                Edit Identity
                            </button>
                        }
                    />
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-10">

                    {/* 2️⃣ Financial Health Grid (Only for Management) */}
                    {member.role !== OrganizationRole.VOLUNTEER && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Row 1: Funding Sources */}
                            {isFestival ? (
                                <>
                                    {/* 1. Opening Balance (Initial Collection) */}
                                    <StatCard
                                        title="Opening Balance"
                                        value={`₹${Number(financials.openingBalance).toLocaleString()}`}
                                        subtext="Collection Till App Onboarding"
                                        iconName="wallet"
                                        iconColor="text-slate-500"
                                    />
                                    {/* 2. Member Donations (App Recorded) */}
                                    <StatCard
                                        title="Recorded Donations"
                                        value={`₹${Number(financials.totalDonations).toLocaleString()}`}
                                        subtext={`${financials.totalDonationCount - financials.sponsorshipCount} app contributions`}
                                        iconName="donation"
                                        iconColor="text-green-500"
                                    />
                                    {/* 3. Sponsorships (External) */}
                                    <StatCard
                                        title="Sponsorships"
                                        value={`₹${Number(financials.totalSponsorships).toLocaleString()}`}
                                        subtext={`${financials.sponsorshipCount} partner assets`}
                                        iconName="target"
                                        iconColor="text-indigo-500"
                                    />
                                    {/* 4. Total Collection (Liquidity) */}
                                    <StatCard
                                        title="Available Liquidity"
                                        value={`₹${Number(financials.totalLiquidity).toLocaleString()}`}
                                        subtext="Combined Financial Strength"
                                        iconName="balance"
                                        iconColor="text-emerald-600"
                                    />
                                </>
                            ) : (
                                <>
                                    {/* 1. Fund Allotted (Initial + General) */}
                                    <StatCard
                                        title="Starting Allocation"
                                        value={financials.openingBalance ? `₹${(Number(financials.openingBalance) + Number(financials.totalFunds)).toLocaleString()}` : "Not Set"}
                                        subtext="Starting Allocation + Internal Funds"
                                        iconName="target"
                                        iconColor="text-saffron-500"
                                    />
                                    {/* 2. Sponsorships (External) */}
                                    <StatCard
                                        title="Sponsorships"
                                        value={`₹${Number(financials.totalSponsorships).toLocaleString()}`}
                                        subtext={`${financials.sponsorshipCount} external partners`}
                                        iconName="donation"
                                        iconColor="text-purple-500"
                                    />
                                    {/* 3. Total Funds (Total Liquidity) */}
                                    <StatCard
                                        title="Remaining Allocation"
                                        value={`₹${Number(financials.totalLiquidity).toLocaleString()}`}
                                        subtext="Allocation + Funds + Sponsorships"
                                        iconName="balance"
                                        iconColor="text-emerald-600"
                                    />
                                </>
                            )}

                            {/* Row 2: Spending */}
                            {/* Approved Expenses */}
                            <StatCard
                                title="Approved Expenses"
                                value={`₹${Number(financials.totalExpenses).toLocaleString()}`}
                                subtext={`${financials.approvedExpenseCount} items cleared`}
                                iconName="approved"
                                iconColor="text-blue-500"
                            />

                            {/* Row 3: Net Position */}
                            <div className={cn(isFestival ? "sm:col-span-1" : "sm:col-span-2")}>
                                <StatCard
                                    title="Remaining Balance"
                                    value={`₹${Number(financials.remainingBalance).toLocaleString()}`}
                                    subtext={isFestival ? "Festival funds available" : "Club funds available"}
                                    iconName="wallet"
                                    iconColor="text-emerald-500"
                                    isNegative={Number(financials.remainingBalance) < 0}
                                />
                            </div>

                            {/* Secondary Stats (Utilization / Pending) */}
                            <StatCard
                                title="Pending Expenses"
                                value={`₹${Number(financials.totalPendingExpenses).toLocaleString()}`}
                                subtext={`${financials.pendingExpenseCount} awaiting approval`}
                                iconName="pending"
                                iconColor="text-amber-500"
                                isNegative={financials.pendingExpenseCount > 0}
                            />

                            <StatCard
                                title="Utilization"
                                value={`${Math.round(financials.utilizationRate)}%`}
                                progress={financials.utilizationRate}
                                subtext={financials.isOverspent ? "Available funds exceeded" : "Healthy Spending"}
                                iconName="utilization"
                                iconColor={financials.isOverspent ? "text-red-500" : "text-green-500"}
                            />
                        </div>
                    )}

                    {/* 3️⃣ Operational Alerts */}
                    {(data.alerts.pendingExpenses > 0 || data.alerts.pendingBhog > 0 || data.alerts.isOverspent || data.alerts.noTreasurer) && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">
                                Operational Alerts
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {data.alerts.pendingExpenses > 0 && member.role !== OrganizationRole.VOLUNTEER && (
                                    <AlertBox
                                        type="warning"
                                        title="Pending Approvals"
                                        description={`${data.alerts.pendingExpenses} expense requests require treasurer or admin clearance.`}
                                        actionLabel="Review"
                                        actionHref={`/${orgSlug}/dashboard/expenses`}
                                    />
                                )}
                                {data.alerts.pendingBhog > 0 && member.role !== OrganizationRole.VOLUNTEER && (
                                    <AlertBox
                                        type="info"
                                        title="Bhog Moderation"
                                        description={`${data.alerts.pendingBhog} new sponsorship items are awaiting preparation status.`}
                                        actionLabel="Moderate"
                                        actionHref={`/${orgSlug}/dashboard/bhog`}
                                    />
                                )}
                                {data.alerts.isOverspent && member.role !== OrganizationRole.VOLUNTEER && (
                                    <AlertBox
                                        type="error"
                                        title={isFestival ? "Budget Alert" : "Funding Alert"}
                                        description={isFestival
                                            ? "Expenditures have exceeded total donations. Please review financial strategy."
                                            : "Expenditures have exceeded available funds. Please review organizational liquidity."
                                        }
                                    />
                                )}
                                {data.alerts.noTreasurer && member.role !== OrganizationRole.VOLUNTEER && (
                                    <AlertBox
                                        type="warning"
                                        title="Treasury Warning"
                                        description="No dedicated Treasurer assigned. Admin is handling all financial approvals."
                                        actionLabel="Add Member"
                                        actionHref={`/${orgSlug}/dashboard/members`}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* 3.1️⃣ Operational Intelligence breakdown (Only for Management) */}
                    {member.role !== OrganizationRole.VOLUNTEER && (
                        <div className="space-y-4">
                            <EventFinancialBreakdown events={data.eventFinancials.eventBreakdown} isFestival={isFestival} />
                        </div>
                    )}

                    {/* 4️⃣ Quick Actions */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">
                            Direct Command Hub
                        </h3>
                        <ActionRow organizationId={organization.id} role={member.role} isFestival={isFestival} />
                    </div>
                </div>

                <div className="space-y-10">
                    {/* 6️⃣ Mini Operational Snapshots */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">
                            Snapshot Radar
                        </h3>
                        <div className="space-y-3">
                            <MiniWidget
                                title="Volunteers"
                                count={data.stats.volunteers.total}
                                sublabel="Need Tasks"
                                subcount={data.stats.volunteers.unassigned}
                                iconName="volunteers"
                                variant={data.stats.volunteers.unassigned > 0 ? "warning" : "default"}
                            />
                            {data.organization.type === "FESTIVAL" && (
                                <MiniWidget
                                    title="Bhog Items"
                                    count={data.stats.bhog.total}
                                    sublabel="Pending"
                                    subcount={data.stats.bhog.pending}
                                    iconName="bhog"
                                    variant={data.stats.bhog.pending > 0 ? "warning" : "default"}
                                />
                            )}
                            <MiniWidget
                                title="Events"
                                count={data.stats.events.total}
                                sublabel="Upcoming"
                                subcount={data.stats.events.upcoming}
                                iconName="events"
                                variant={data.stats.events.upcoming > 0 ? "default" : "warning"}
                            />
                            <MiniWidget
                                title="Management"
                                count={data.stats.members.total}
                                sublabel="Admins"
                                subcount={data.stats.members.byRole[OrganizationRole.ADMIN] || 0}
                                iconName="members"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
