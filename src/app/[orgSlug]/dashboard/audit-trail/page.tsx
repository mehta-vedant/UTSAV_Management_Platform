import { redirect } from "next/navigation";
import { FileSearch } from "lucide-react";
import { resolveOrgContext } from "@/lib/org-context";
import { getInternalAuditTrail } from "@/modules/finance/audit-trail.service";
import { hasPermission } from "@/lib/access-control";
import { OrganizationRole } from "@prisma/client";
import AuditTrailTable from "@/components/dashboard/audit-trail/AuditTrailTable";

export default async function AuditTrailPage({
    params,
}: {
    params: { orgSlug: string };
    searchParams?: Record<string, string | string[] | undefined>;
}) {
    const { organization, member } = await resolveOrgContext(params.orgSlug);

    const canViewAudit = hasPermission(member.role, "audit:read");

    if (!canViewAudit) {
        redirect(`/${params.orgSlug}/dashboard`);
    }

    // Sensitivity: COMMITTEE_MEMBER has "finance:read" but NOT "audit:read".
    // The full donor-name ledger is reserved for ADMIN + TREASURER.
    const data = await getInternalAuditTrail(
        organization.id,
        { page: 1, pageSize: 500 },
        {}
    );

    const isFestival = organization.type === "FESTIVAL";
    const canApprove = member.role === OrganizationRole.ADMIN || member.role === OrganizationRole.TREASURER;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <div className="mb-2 flex items-center gap-2">
                    <FileSearch className="h-5 w-5 text-saffron-500" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Verified Ledger</span>
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 sm:text-4xl sm:tracking-tighter">Audit Trail</h1>
                <p className="mt-1 font-medium text-slate-500">
                    Unified financial ledger with full contributor and approval detail.
                </p>
            </div>

            <AuditTrailTable
                entries={data.items as any}
                totals={data.totals}
                organizationName={organization.name}
                isFestival={isFestival}
                canApprove={canApprove}
            />
        </div>
    );
}