import { notFound } from "next/navigation";
import { getOrganizationBySlug } from "@/modules/core/organization.service";
import { getPublicFinancialOverview } from "@/modules/festival/public-financial.service";
import { getPublicDonations } from "@/modules/festival/public-donation.service";
import { getPublicApprovedExpenses } from "@/modules/festival/public-expense.service";
import { getPublicBhogList } from "@/modules/festival/public-bhog.service";
import { getPublicEvents } from "@/modules/festival/public-event.service";

// Public Components
import SectionWrapper from "@/components/public/SectionWrapper";
import FinancialHero from "@/components/public/FinancialHero";
import DonationList from "@/components/public/DonationList";
import ExpenseList from "@/components/public/ExpenseList";
import BhogSection from "@/components/public/BhogSection";
import EventTimeline from "@/components/public/EventTimeline";
import { Calendar as CalendarIcon, MapPin } from "lucide-react";
import { isFestivalOrganization } from "@/lib/organization-mode";

interface PublicPageProps {
    params: {
        orgSlug: string;
    };
}

export default async function PublicOrganizationPage({ params }: PublicPageProps) {
    const { orgSlug } = params;

    // 1. Resolve Organization (Cached & Memoized)
    const organization = await getOrganizationBySlug(orgSlug);

    if (!organization || !isFestivalOrganization(organization)) {
        notFound();
    }

    // 2. Parallel Data Fetching
    const [financials, donations, expenses, bhogList, events] = await Promise.all([
        getPublicFinancialOverview(organization.id),
        getPublicDonations(organization.id),
        getPublicApprovedExpenses(organization.id),
        getPublicBhogList(organization.id),
        getPublicEvents(organization.id),
    ]);

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] pb-16 sm:pb-24">
            {/* Dynamic Header / Hero */}
            <header className="relative overflow-hidden border-b border-slate-100 bg-white px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-20">
                {/* Subtle Decorative Elements */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-saffron-50/30 to-transparent pointer-events-none" />
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-50 rounded-full blur-3xl opacity-50" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <SectionWrapper delay={0.1}>
                        <div className="flex flex-col items-center text-center">
                            <h1 className="mobile-safe-text mt-6 mb-6 max-w-full text-4xl font-black tracking-tight text-slate-900 sm:mt-8 sm:text-5xl md:text-6xl">
                                {organization.name}
                            </h1>

                            <div className="flex flex-wrap items-center justify-center gap-3 text-center text-xs font-bold text-slate-400 sm:gap-6 sm:text-sm">
                                <div className="flex items-center">
                                    <CalendarIcon className="w-4 h-4 mr-2 text-saffron-500" />
                                    {new Date(organization.startDate).toLocaleDateString("en-IN", { month: 'long', year: 'numeric' })}
                                </div>
                                <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-2 text-saffron-500" />
                                    Community Organized
                                </div>
                            </div>

                            {organization.description && (
                                <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-slate-500 sm:mt-8 md:text-xl">
                                    {organization.description}
                                </p>
                            )}

                            {organization.status === "ENDED" && (
                                <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700">
                                    This festival has ended.
                                </div>
                            )}
                        </div>
                    </SectionWrapper>
                </div>
            </header>

            <main className="relative z-20 mx-auto -mt-8 max-w-7xl px-4 sm:-mt-10 sm:px-6">
                {/* 1. Statistics Cards */}
                <FinancialHero financials={financials} />

                {/* 2. Primary Data Grids */}
                <div className="mb-12 grid grid-cols-1 gap-5 sm:gap-8 lg:grid-cols-3">
                    <SectionWrapper className="lg:col-span-1" delay={0.7}>
                        <DonationList donations={donations} />
                    </SectionWrapper>
                    <SectionWrapper className="lg:col-span-1" delay={0.8}>
                        <ExpenseList expenses={expenses} />
                    </SectionWrapper>
                    <SectionWrapper className="lg:col-span-1" delay={0.9}>
                        <BhogSection
                            bhogList={bhogList}
                            organizationId={organization.id}
                            OrganizationName={organization.name}
                            festivalStartDate={organization.startDate}
                            festivalEndDate={organization.endDate}
                            festivalStatus={organization.status}
                            prasadWindowConfig={{
                                morningStart: organization.prasadMorningStart,
                                morningEnd: organization.prasadMorningEnd,
                                eveningStart: organization.prasadEveningStart,
                                eveningEnd: organization.prasadEveningEnd,
                            }}
                        />
                    </SectionWrapper>
                </div>

                {/* 4. Event Engagement */}
                <SectionWrapper delay={1.0}>
                    <EventTimeline events={events} />
                </SectionWrapper>
            </main>

            {/* Persistent Footer */}
            <footer className="mx-auto mt-14 max-w-7xl border-t border-slate-100 px-4 pt-8 sm:mt-20 sm:px-6 sm:pt-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl">U</div>
                        <div>
                            <p className="font-black text-slate-900 leading-none">UTSAV</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Transparent Community Finance</p>
                        </div>
                    </div>

                    <a href={`/${orgSlug}/transparency`} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-saffron-500">
                        View Audit Trail
                    </a>
                </div>
                <p className="text-center text-[10px] font-bold text-slate-300 mt-10 uppercase tracking-[0.3em]">
                    © 2026 {organization.name} • UTSAV
                </p>
            </footer>
        </div>
    );
}
