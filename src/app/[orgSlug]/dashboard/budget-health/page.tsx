import { BrainCircuit } from "lucide-react";
import { resolveOrgContext } from "@/lib/org-context";
import { getBudgetHealthReport } from "@/modules/finance/budget-health.service";
import BudgetHealthReport from "@/components/dashboard/budget/BudgetHealthReport";

export default async function BudgetHealthPage({ params }: { params: { orgSlug: string } }) {
    const { organization } = await resolveOrgContext(params.orgSlug);
    const report = await getBudgetHealthReport(organization.id);
    return <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"><div><div className="mb-2 flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-violet-600" /><span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Read-only planning</span></div><h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 sm:text-4xl">Budget Health</h1><p className="mt-1 font-medium text-slate-500">Understand recorded spending and scenarios before making a human decision.</p></div><BudgetHealthReport organizationId={organization.id} report={report} /></div>;
}
