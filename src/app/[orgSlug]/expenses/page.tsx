import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ReceiptText, TrendingDown } from "lucide-react";
import { getOrganizationBySlug } from "@/modules/core/organization.service";
import { getPublicApprovedExpenses } from "@/modules/festival/public-expense.service";
import SectionWrapper from "@/components/public/SectionWrapper";
import { isFestivalOrganization } from "@/lib/organization-mode";

interface AllExpensesPageProps {
    params: {
        orgSlug: string;
    };
}

export default async function AllExpensesPage({ params }: AllExpensesPageProps) {
    const { orgSlug } = params;
    const organization = await getOrganizationBySlug(orgSlug);

    if (!organization || !isFestivalOrganization(organization)) {
        notFound();
    }

    const expenses = await getPublicApprovedExpenses(organization.id, 500);

    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

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
                        <span className="font-black text-slate-900 text-xs tracking-tighter uppercase">UTSAV Expenses</span>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
                {/* Hero Section */}
                <SectionWrapper delay={0.1}>
                    <div className="mb-12">
                        <div className="flex items-center gap-2 px-1 mb-4">
                            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                                <TrendingDown className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Verified Ledger</span>
                        </div>
                        <h1 className="mt-4 mb-4 text-4xl font-black uppercase tracking-tight text-slate-900 sm:text-5xl md:text-6xl md:tracking-tighter">
                            All Expenses
                        </h1>
                        <p className="max-w-2xl text-base font-medium text-slate-500 sm:text-lg">
                            Every approved expense for <span className="text-slate-900 font-bold underline decoration-saffron-500 decoration-2">{organization.name}</span>.
                        </p>
                    </div>
                </SectionWrapper>

                {/* Summary */}
                <SectionWrapper delay={0.2}>
                    <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
                        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Expenditure</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter text-rose-600">₹{totalSpent.toLocaleString("en-IN")}</h3>
                        </div>
                        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Expenses Recorded</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">₹{expenses.length}</h3>
                        </div>
                    </div>
                </SectionWrapper>

                {/* Expenses Table */}
                <SectionWrapper delay={0.3}>
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        {expenses.length === 0 ? (
                            <div className="py-32 text-center text-slate-400 font-bold uppercase tracking-widest">
                                No approved expenses yet
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Description</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {expenses.map((e) => (
                                            <tr key={e.id} className="group hover:bg-slate-50/30 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="text-sm font-bold text-slate-900">
                                                        {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border shadow-sm bg-rose-50 text-rose-600 border-rose-100">
                                                            <ReceiptText className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-slate-900 group-hover:text-saffron-600 transition-colors uppercase tracking-tight">
                                                                {e.title}
                                                            </div>
                                                            {e.paymentMode && (
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                                    {e.paymentMode.replace("_", " ")}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                                                        {e.category}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                        Approved
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="text-base font-black tracking-tight text-rose-600">
                                                        -₹{Number(e.amount).toLocaleString("en-IN")}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </SectionWrapper>
            </main>
        </div>
    );
}
