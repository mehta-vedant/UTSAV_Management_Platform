import { validateAccess } from "@/lib/access-control";
import { formatOrgDateTime, formatOrgDate } from "@/lib/date-time";
import { DashboardSearchParams, parsePageQuery } from "@/lib/pagination";
import { formatOfferingWindow } from "@/lib/prasad-windows";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/shared/EmptyState";
import { DashboardFilters } from "@/components/dashboard/shared/DashboardFilters";
import { PaginationControls } from "@/components/dashboard/shared/PaginationControls";
import BhogModerationActions from "@/components/dashboard/bhog/BhogModerationActions";
import AddBhogModal from "@/components/dashboard/bhog/AddBhogModal";
import { getOrganizationBySlug } from "@/modules/core/organization.service";
import { getPaginatedBhogItems } from "@/modules/festival/bhog.service";
import { BhogStatus, OrganizationRole } from "@prisma/client";
import { CheckCircle2, Clock, Utensils } from "lucide-react";

export default async function BhogModerationPage({
    params,
    searchParams,
}: {
    params: { orgSlug: string };
    searchParams?: DashboardSearchParams;
}) {
    const organization = await getOrganizationBySlug(params.orgSlug);
    if (!organization) return <div>Organization not found</div>;

    const { member: currentMember } = await validateAccess(organization.id);
    const query = parsePageQuery(searchParams);
    const bhogItems = await getPaginatedBhogItems(organization.id, query);

    const isModerator = currentMember.role === OrganizationRole.ADMIN || currentMember.role === OrganizationRole.COMMITTEE_MEMBER;
    const isAdmin = currentMember.role === OrganizationRole.ADMIN;
    const windowConfig = {
        morningStart: organization.prasadMorningStart,
        morningEnd: organization.prasadMorningEnd,
        eveningStart: organization.prasadEveningStart,
        eveningEnd: organization.prasadEveningEnd,
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <Utensils className="h-5 w-5 text-saffron-500" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Prasadam Moderation</span>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 sm:text-4xl sm:tracking-tighter">Bhog Sponsorships</h1>
                    <p className="mt-1 font-medium text-slate-500">Manage and track public contributions for organization offerings.</p>
                </div>

                {isModerator && <AddBhogModal organizationId={organization.id} />}
            </div>

            <DashboardFilters
                searchPlaceholder="Search prasad offerings"
                current={query}
                statusOptions={Object.values(BhogStatus).map((status) => ({ value: status, label: status }))}
            />

            <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white text-sm shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Detail</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Offering Slot</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Sponsor</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Storage</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Moderation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {bhogItems.items.map((item) => (
                                <tr key={item.id} className="group transition-all duration-200 hover:bg-slate-50/50">
                                    <td className="px-8 py-6">
                                        <div>
                                            <div className="font-bold uppercase tracking-tight text-slate-900">{item.name}</div>
                                            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Submitted {formatOrgDateTime(item.submittedAt, organization.timezone)}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-slate-700">{formatOrgDate(item.offeringDate, organization.timezone)}</div>
                                        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {formatOfferingWindow(item.offeringWindow, windowConfig)}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-medium text-slate-700">{item.sponsorName}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-slate-500">{item.quantity}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="w-fit rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-slate-400">
                                            {item.storage || "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <BhogStatusBadge status={item.status} />
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <BhogModerationActions itemId={item.id} organizationId={organization.id} status={item.status} isAdmin={isAdmin} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {bhogItems.items.length === 0 ? (
                    <EmptyState title="No offerings found" message="Try a different status, date range, or search term." />
                ) : (
                    <PaginationControls
                        basePath={`/${params.orgSlug}/dashboard/bhog`}
                        searchParams={searchParams}
                        page={bhogItems.page}
                        pageSize={bhogItems.pageSize}
                        totalItems={bhogItems.totalItems}
                        totalPages={bhogItems.totalPages}
                    />
                )}
            </div>
        </div>
    );
}

function BhogStatusBadge({ status }: { status: BhogStatus }) {
    const config = {
        [BhogStatus.PENDING]: { icon: Clock, text: "Waitlisted", class: "bg-amber-50 text-amber-600 border-amber-100" },
        [BhogStatus.PREPARED]: { icon: CheckCircle2, text: "Prepared", class: "bg-green-50 text-green-600 border-green-100" },
    }[status];

    const Icon = config.icon;

    return (
        <div className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest", config.class)}>
            <Icon className="h-3.5 w-3.5" />
            {config.text}
        </div>
    );
}
