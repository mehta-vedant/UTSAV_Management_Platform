import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardSearchParams, buildPageHref } from "@/lib/pagination";

type PaginationControlsProps = {
    basePath: string;
    searchParams?: DashboardSearchParams;
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
};

export function PaginationControls({ basePath, searchParams, page, totalPages, totalItems, pageSize }: PaginationControlsProps) {
    const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const lastItem = Math.min(totalItems, page * pageSize);

    return (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 md:flex-row md:items-center md:justify-between">
            <div>
                Showing {firstItem}-{lastItem} of {totalItems}
            </div>
            <div className="flex items-center gap-2">
                <PageLink disabled={page <= 1} href={buildPageHref(basePath, searchParams, page - 1)} label="Previous" icon="prev" />
                <div className="rounded-xl border border-slate-200 px-4 py-2 text-slate-700">
                    Page {page} / {totalPages}
                </div>
                <PageLink disabled={page >= totalPages} href={buildPageHref(basePath, searchParams, page + 1)} label="Next" icon="next" />
            </div>
        </div>
    );
}

function PageLink({ disabled, href, label, icon }: { disabled: boolean; href: string; label: string; icon: "prev" | "next" }) {
    const content = (
        <>
            {icon === "prev" && <ChevronLeft className="h-4 w-4" />}
            <span>{label}</span>
            {icon === "next" && <ChevronRight className="h-4 w-4" />}
        </>
    );

    if (disabled) {
        return <span className="inline-flex items-center gap-1 rounded-xl border border-slate-100 px-4 py-2 text-slate-300">{content}</span>;
    }

    return <Link href={href} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-saffron-300 hover:text-saffron-600">{content}</Link>;
}
