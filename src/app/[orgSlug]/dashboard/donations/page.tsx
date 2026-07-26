import { resolveOrgContext } from "@/lib/org-context";
import { formatOrgDateTime } from "@/lib/date-time";
import { DashboardSearchParams, parsePageQuery } from "@/lib/pagination";
import { EmptyState } from "@/components/dashboard/shared/EmptyState";
import { DashboardFilters } from "@/components/dashboard/shared/DashboardFilters";
import { PaginationControls } from "@/components/dashboard/shared/PaginationControls";
import RecordDonationModal from "@/components/dashboard/donations/RecordDonationModal";
import EditDonationModal from "@/components/dashboard/donations/EditDonationModal";
import { getPaginatedDonations } from "@/modules/finance/donation.service";
import { DonationCategory, OrganizationRole } from "@prisma/client";
import { Heart } from "lucide-react";

export default async function DonationsPage({
    params,
    searchParams,
}: {
    params: { orgSlug: string };
    searchParams?: DashboardSearchParams;
}) {
    const { organization, member, isFestival } = await resolveOrgContext(params.orgSlug);
    const query = parsePageQuery(searchParams);
    const donations = await getPaginatedDonations(organization.id, query);

    const canAdd = ([OrganizationRole.ADMIN, OrganizationRole.TREASURER, OrganizationRole.COMMITTEE_MEMBER] as string[]).includes(member.role);
    const term = isFestival ? "Donation" : "Funds";
    const pluralTerm = isFestival ? "Donations" : "Fund Records";
    const contributorTerm = isFestival ? "Donor Name" : "Source";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <Heart className="h-5 w-5 text-saffron-500" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{isFestival ? "Contribution Hub" : "Financial Source"}</span>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 sm:text-4xl sm:tracking-tighter">{term} Records</h1>
                    <p className="mt-1 font-medium text-slate-500">
                        {isFestival
                            ? "Manage all voluntary contributions received for the pavilion."
                            : "Track all funds and internal contributions for the organization."}
                    </p>
                </div>

                {canAdd && <RecordDonationModal organizationId={organization.id} isFestival={isFestival} />}
            </div>

            <DashboardFilters
                searchPlaceholder={`Search ${pluralTerm.toLowerCase()}`}
                current={query}
                categoryOptions={Object.values(DonationCategory).map((category) => ({
                    value: category,
                    label: category.replace("_", " "),
                }))}
            />

            <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white text-sm shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{contributorTerm}</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Recorded By</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {donations.items.map((donation) => (
                                <tr key={donation.id} className="group transition-colors hover:bg-slate-50/50">
                                    <td className="px-8 py-6">
                                        <div className="font-bold uppercase tracking-tight text-slate-900">{donation.donorName}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="w-fit rounded-lg bg-saffron-50 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-saffron-600">
                                            {donation.category.replace("_", " ")}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 font-black text-slate-900">Rs {Number(donation.amount).toLocaleString()}</td>
                                    <td className="px-8 py-6">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {formatOrgDateTime(donation.receivedAt, organization.timezone)}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-bold uppercase tracking-tight text-slate-900">
                                            {donation.addedBy?.user?.name || "System"}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {(member.role === OrganizationRole.ADMIN || member.role === OrganizationRole.TREASURER) && (
                                            <EditDonationModal
                                                organizationId={organization.id}
                                                isFestival={isFestival}
                                                donation={{
                                                    ...donation,
                                                    amount: Number(donation.amount),
                                                }}
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {donations.items.length === 0 ? (
                    <EmptyState title="No records found" message="Try a different search, date range, or category filter." />
                ) : (
                    <PaginationControls
                        basePath={`/${params.orgSlug}/dashboard/donations`}
                        searchParams={searchParams}
                        page={donations.page}
                        pageSize={donations.pageSize}
                        totalItems={donations.totalItems}
                        totalPages={donations.totalPages}
                    />
                )}
            </div>
        </div>
    );
}
