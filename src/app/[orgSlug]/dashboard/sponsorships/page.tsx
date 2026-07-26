import { getTenantPrisma, validateAccess } from "@/lib/access-control";
import { getOrganizationBySlug } from "@/modules/core/organization.service";
import { OrganizationRole } from "@prisma/client";
import { Handshake, Plus, Calendar, Coins, Landmark, Sparkles } from "lucide-react";
import { format } from "date-fns";
import RecordDonationModal from "@/components/dashboard/donations/RecordDonationModal";
import EditDonationModal from "@/components/dashboard/donations/EditDonationModal";

export default async function SponsorshipsPage({ params }: { params: { orgSlug: string } }) {
    const organization = await getOrganizationBySlug(params.orgSlug);
    if (!organization) return <div>Organization not found</div>;

    // Ensure this is a CLUB
    if (organization.type === "FESTIVAL") {
        return <div>Sponsorships are managed under Donations for Festivals.</div>;
    }

    const { member: currentMember } = await validateAccess(organization.id);
    const tenantPrisma = getTenantPrisma(organization.id);

    const sponsorships = await tenantPrisma.donation.findMany({
        where: {
            isArchived: false,
            category: "SPONSORSHIP" as any // Type-casting until TS server updates
        },
        include: {
            addedBy: {
                select: { user: { select: { name: true } } }
            }
        },
        orderBy: { date: "desc" }
    });

    const canAdd = ([OrganizationRole.ADMIN, OrganizationRole.TREASURER, OrganizationRole.COMMITTEE_MEMBER] as string[]).includes(currentMember.role);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Handshake className="w-5 h-5 text-saffron-500" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">External Partnerships</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Sponsorships</h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Track and manage financial support from external sponsors.
                    </p>
                </div>

                {canAdd && <RecordDonationModal organizationId={organization.id} isFestival={false} defaultCategory="SPONSORSHIP" />}
            </div>

            {/* Sponsorships List */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm text-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Sponsor Name</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date Received</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sponsorships.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium">
                                        No sponsorships recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                sponsorships.map((sponsorship) => (
                                    <tr key={sponsorship.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="font-bold text-slate-900 uppercase tracking-tight">{sponsorship.donorName}</div>
                                        </td>
                                        <td className="px-8 py-6 font-black text-slate-900">
                                            ₹{Number(sponsorship.amount).toLocaleString()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                {format(new Date(sponsorship.date), "MMM d, yyyy")}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-slate-500 max-w-[200px] truncate">
                                                {sponsorship.notes || "-"}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {(currentMember.role === OrganizationRole.ADMIN || currentMember.role === OrganizationRole.TREASURER) && (
                                                <EditDonationModal
                                                    organizationId={organization.id}
                                                    isFestival={false}
                                                    donation={{
                                                        ...sponsorship,
                                                        amount: Number(sponsorship.amount)
                                                    }}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
