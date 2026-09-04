import { BarChart3 } from "lucide-react";
import { resolveOrgContext } from "@/lib/org-context";
import { getReportsData, TimeBucket } from "@/modules/finance/reports.service";
import ReportsDashboard from "@/components/dashboard/reports/ReportsDashboard";

export default async function ReportsPage({
    params,
    searchParams,
}: {
    params: { orgSlug: string };
    searchParams?: { bucket?: string };
}) {
    const { organization } = await resolveOrgContext(params.orgSlug);
    const bucketParam = Array.isArray(searchParams?.bucket) ? searchParams.bucket[0] : searchParams?.bucket;
    const bucket: TimeBucket = bucketParam === "weekly" || bucketParam === "monthly" ? bucketParam : "daily";

    const data = await getReportsData(organization.id, { bucket });

    const isFestival = organization.type === "FESTIVAL";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <div className="mb-2 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-saffron-500" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Analytics & Insights</span>
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 sm:text-4xl sm:tracking-tighter">Reports</h1>
                <p className="mt-1 font-medium text-slate-500">
                    Visual breakdowns of donations, expenses, and event budgets.
                </p>
            </div>

            <ReportsDashboard
                data={data as any}
                orgSlug={params.orgSlug}
                organizationName={organization.name}
                currentBucket={bucket}
                isFestival={isFestival}
            />
        </div>
    );
}