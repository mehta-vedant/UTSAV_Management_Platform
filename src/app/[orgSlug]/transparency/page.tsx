import { notFound } from "next/navigation";
import { getOrganizationBySlug } from "@/modules/core/organization.service";
import { getFullAuditTrail, getTransparencyStats, getPublicSchedule } from "@/modules/festival/public-transparency.service";
import AuditTable from "@/components/public/transparency/AuditTable";
import PublicSchedule from "@/components/public/transparency/PublicSchedule";
import SectionWrapper from "@/components/public/SectionWrapper";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface TransparencyPageProps {
    params: {
        orgSlug: string;
    };
}

export default async function TransparencyPage({ params }: TransparencyPageProps) {
    const { orgSlug } = params;
    const organization = await getOrganizationBySlug(orgSlug);

    if (!organization || organization.type === "CLUB") notFound();

    const [auditTrail, stats, schedule] = await Promise.all([
        getFullAuditTrail(organization.id),
        getTransparencyStats(organization.id),
        getPublicSchedule(organization.id),
    ]);

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] pb-16 sm:pb-24">
            {/* Header */}
            <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                    <Link
                        href={`/${orgSlug}`}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-saffron-600 sm:text-xs"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Organization
                    </Link>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-sm">U</div>
                        <span className="font-black text-slate-900 text-xs tracking-tighter uppercase">UTSAV Transparency</span>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
                {/* Hero Section */}
                <SectionWrapper delay={0.1}>
                    <div className="mb-12">
                        <h1 className="mt-6 mb-4 text-4xl font-black uppercase tracking-tight text-slate-900 sm:mt-8 md:text-6xl md:tracking-tighter">
                            Audit Trail
                        </h1>
                        <p className="max-w-2xl text-base font-medium text-slate-500 sm:text-lg">
                            Verified financial records and event history for <span className="text-slate-900 font-bold underline decoration-saffron-500 decoration-2">{organization.name}</span>.
                        </p>
                    </div>
                </SectionWrapper>

                {/* Quick Stats Grid */}
                <SectionWrapper delay={0.2}>
                    <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6 lg:mb-12">
                        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Collections</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">₹{stats.totalDonations.toLocaleString()}</h3>
                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tight">{stats.donationCount} Donations</p>
                        </div>
                        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Expenditures</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter text-rose-600">₹{stats.totalExpenses.toLocaleString()}</h3>
                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tight">{stats.expenseCount} Expenses</p>
                        </div>
                        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Remaining Balance</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter text-emerald-600">₹{(stats.totalDonations - stats.totalExpenses).toLocaleString()}</h3>
                        </div>
                    </div>
                </SectionWrapper>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
                    {/* Left: Financial Audit Trail */}
                    <div className="lg:col-span-2 space-y-12">
                        <SectionWrapper delay={0.3}>
                            <div className="mb-6 flex items-center gap-2 px-1">
                                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Verified Ledger</h3>
                            </div>
                            <AuditTable entries={auditTrail as any} />
                        </SectionWrapper>
                    </div>

                    {/* Right: Public Schedule */}
                    <div className="space-y-12">
                        <SectionWrapper delay={0.6}>
                            <PublicSchedule events={schedule as any} />
                        </SectionWrapper>
                    </div>
                </div>
            </main>
        </div>
    );
}
