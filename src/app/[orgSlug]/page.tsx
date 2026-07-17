import { notFound } from "next/navigation";
import { OrganizationService } from "@/modules/core/organization.service";
import { PublicFinancialService } from "@/modules/festival/public-financial.service";
import { PublicDonationService } from "@/modules/festival/public-donation.service";
import { PublicExpenseService } from "@/modules/festival/public-expense.service";
import { PublicBhogService } from "@/modules/festival/public-bhog.service";
import { PublicEventService } from "@/modules/festival/public-event.service";

// Premium Modular Components
import SectionWrapper from "@/components/public/SectionWrapper";
import FinancialHero from "@/components/public/FinancialHero";
import FinancialCharts from "@/components/public/FinancialCharts";
import DonationList from "@/components/public/DonationList";
import ExpenseList from "@/components/public/ExpenseList";
import BhogSection from "@/components/public/BhogSection";
import EventTimeline from "@/components/public/EventTimeline";
import { ShieldCheck, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { isFestivalOrganization } from "@/lib/organization-mode";

interface PublicPageProps {
    params: {
        orgSlug: string;
    };
}

export default async function PublicOrganizationPage({ params }: PublicPageProps) {
    const { orgSlug } = params;

    // 1. Resolve Organization (Cached & Memoized)
    const organization = await OrganizationService.getOrganizationBySlug(orgSlug);

    if (!organization || !isFestivalOrganization(organization)) {
        notFound();
    }

    // 2. Parallel Data Fetching
    const [financials, donations, expenses, bhogList, events] = await Promise.all([
        PublicFinancialService.getPublicFinancialOverview(organization.id),
        PublicDonationService.getPublicDonations(organization.id),
        PublicExpenseService.getPublicApprovedExpenses(organization.id),
        PublicBhogService.getPublicBhogList(organization.id),
        PublicEventService.getPublicEvents(organization.id),
    ]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* Dynamic Header / Hero */}
            <header className="relative bg-white border-b border-slate-100 pt-20 pb-16 px-6 overflow-hidden">
                {/* Subtle Decorative Elements */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-saffron-50/30 to-transparent pointer-events-none" />
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-50 rounded-full blur-3xl opacity-50" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <SectionWrapper delay={0.1}>
                        <div className="flex flex-col items-center text-center">
                            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-6 mt-8">
                                {organization.name}
                            </h1>

                            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-bold text-slate-400">
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
                                <p className="mt-8 text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
                                    {organization.description}
                                </p>
                            )}

                            {organization.status === "ENDED" && (
                                <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700">
                                    This festival has ended. The page remains available as a read-only transparency archive.
                                </div>
                            )}
                        </div>
                    </SectionWrapper>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
                {/* 1. Statistics Cards */}
                <FinancialHero financials={financials} />

                {/* 2. Visual Analytics Section */}
                <SectionWrapper delay={0.6}>
                    <FinancialCharts
                        totalDonations={financials.totalDonations}
                        totalExpenses={financials.totalExpenses}
                        expenses={expenses}
                    />
                </SectionWrapper>

                {/* 3. Primary Data Grids */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
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
            <footer className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl">U</div>
                        <div>
                            <p className="font-black text-slate-900 leading-none">UTSAV</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Platform for Faith & Clarity</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-8 text-xs font-black text-slate-400 uppercase tracking-widest">
                        <button className="hover:text-saffron-600 transition-colors">Contact</button>
                        <button className="hover:text-saffron-600 transition-colors">Volunteers</button>
                        <button className="hover:text-saffron-600 transition-colors">Audit</button>
                    </div>
                </div>
                <p className="text-center text-[10px] font-bold text-slate-300 mt-10 uppercase tracking-[0.3em]">
                    © 2026 {organization.name} • DIGITAL TRANSPARENCY BY UTSAV
                </p>
            </footer>
        </div>
    );
}
