"use client";

import { useState } from "react";
import { AlertTriangle, Bot, Loader2, Sparkles } from "lucide-react";
import { explainBudgetHealthAction } from "@/actions/budget-health.actions";
import type { BudgetHealthReport as BudgetHealthReportData } from "@/modules/finance/budget-health.service";

function money(value: number) {
    return `Rs ${Math.round(value).toLocaleString("en-IN")}`;
}

export default function BudgetHealthReport({ organizationId, report }: { organizationId: string; report: BudgetHealthReportData }) {
    const [isLoading, setIsLoading] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);

    async function askForExplanation() {
        setIsLoading(true);
        const result = await explainBudgetHealthAction(organizationId);
        setExplanation(result.success && result.data ? result.data.explanation : result.error || "Could not create an explanation right now.");
        setIsLoading(false);
    }

    return <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
                ["Available balance", money(report.availableBalance)],
                ["Pending commitments", money(report.pendingCommitments)],
                ["Approved spending", money(report.approvedExpenses)],
                ["Recent daily spend", money(report.recentDailySpend)],
            ].map(([label, value]) => <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-900">{value}</p></div>)}
        </div>

        <section className="rounded-[2rem] border border-violet-100 bg-violet-50 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Explainable AI assistant</p><h2 className="mt-1 text-2xl font-black text-violet-950">Budget health explanation</h2><p className="mt-2 max-w-2xl text-sm font-medium text-violet-900/70">The calculations below are fixed server-side. Gemini only explains these permitted facts; it cannot change your budget or records.</p></div><button type="button" onClick={askForExplanation} disabled={isLoading} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Explain my numbers</button></div>
            {explanation && <p className="mt-5 rounded-2xl bg-white/80 p-4 text-sm font-medium leading-relaxed text-violet-950">{explanation}</p>}
            {report.limitation && <p className="mt-4 text-xs font-bold text-violet-800">Limitation: {report.limitation}</p>}
        </section>

        <section><h2 className="text-xl font-black text-slate-900">Three scenarios</h2><p className="mt-1 text-sm text-slate-500">These are transparent what-if calculations, not predictions or financial advice.</p><div className="mt-4 grid gap-4 lg:grid-cols-3">{report.scenarios.map((scenario) => <article key={scenario.name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-saffron-600">{scenario.name}</p><p className="mt-3 text-2xl font-black text-slate-900">{money(scenario.projectedBalance)}</p><p className="mt-1 text-xs font-bold text-slate-400">Projected remaining balance</p><p className="mt-4 text-sm leading-relaxed text-slate-600">{scenario.assumption}</p><dl className="mt-4 space-y-1 text-xs font-medium text-slate-500"><div className="flex justify-between"><dt>Donations</dt><dd>{money(scenario.projectedDonations)}</dd></div><div className="flex justify-between"><dt>Expenses</dt><dd>{money(scenario.projectedExpenses)}</dd></div></dl></article>)}</div></section>

        <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="font-black text-slate-900">Spending categories</h2><div className="mt-4 space-y-3">{report.categoryUsage.length ? report.categoryUsage.map((item) => <div key={item.category}><div className="flex justify-between text-xs font-bold"><span>{item.category.replaceAll("_", " ")}</span><span>{money(item.amount)}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-saffron-500" style={{ width: `${Math.min(item.percentage, 100)}%` }} /></div></div>) : <p className="text-sm text-slate-500">No approved expenses yet.</p>}</div></div><div className="rounded-3xl border border-amber-100 bg-amber-50 p-6"><h2 className="flex items-center gap-2 font-black text-amber-950"><AlertTriangle className="h-5 w-5" /> Risks and assumptions</h2><ul className="mt-4 space-y-3 text-sm font-medium leading-relaxed text-amber-900">{report.risks.map((risk) => <li key={risk}>• {risk}</li>)}</ul><p className="mt-5 text-xs font-bold text-amber-700">Days remaining: {report.daysRemaining === null ? "No end date recorded" : report.daysRemaining}</p></div></section>
    </div>;
}
