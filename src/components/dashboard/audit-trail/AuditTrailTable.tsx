"use client";

import { useMemo, useState } from "react";
import {
    Search,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    XCircle,
    Clock,
    Wallet,
    Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { csvDownloadBlob, downloadBlob, toCsv, formatAmountForCsv, formatDateForCsv } from "@/lib/export";
import { downloadPdfDocument, pdfFilename } from "@/lib/pdf/download";
import AuditTrailDocument from "@/lib/pdf/AuditTrailDocument";
import type { AuditTrailEntry } from "@/modules/finance/audit-trail.service";

interface AuditTrailTableProps {
    entries: AuditTrailEntry[];
    totals: {
        income: number;
        expense: number;
        balance: number;
    };
    organizationName: string;
    isFestival: boolean;
    canApprove: boolean;
}

const PAGE_SIZE = 12;

export default function AuditTrailTable({ entries, totals, organizationName, isFestival, canApprove }: AuditTrailTableProps) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return entries.filter((e) => {
            const matchesFilter = filter === "ALL" || e.type === filter;
            const matchesSearch =
                e.title.toLowerCase().includes(q) ||
                e.category.toLowerCase().includes(q) ||
                e.eventTitle?.toLowerCase().includes(q);
            return matchesFilter && matchesSearch;
        });
    }, [entries, search, filter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const incomeLabel = isFestival ? "Donations" : "Income";

    const handleExport = () => {
        const columns = ["date", "type", "title", "detail", "category", "paymentMode", "status", "source", "actor", "eventTitle", "amount"];
        const rows = filtered.map((e) => ({
            date: formatDateForCsv(e.date),
            type: e.type,
            title: e.title,
            detail: e.detail || "",
            category: e.category,
            paymentMode: e.paymentMode || "",
            status: e.status || "",
            source: e.source,
            actor: e.actor || "",
            eventTitle: e.eventTitle || "",
            amount: formatAmountForCsv(e.amount),
        }));
        downloadBlob(csvDownloadBlob(toCsv(rows, columns)), `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const containerPdfData = {
        totals,
        entries: filtered.map((e) => ({
            date: new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
            time: new Date(e.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
            type: e.type,
            title: e.title,
            detail: e.detail,
            category: e.category,
            paymentMode: e.paymentMode,
            status: e.status,
            source: e.source,
            actor: e.actor,
            eventTitle: e.eventTitle,
            amount: e.amount,
        })),
    };

    const handleDownloadPdf = () => {
        void downloadPdfDocument(
            <AuditTrailDocument
                organizationName={organizationName}
                incomeLabel={incomeLabel}
                generatedAt={new Date()}
                totals={containerPdfData.totals}
                entries={containerPdfData.entries as any}
            />,
            pdfFilename("audit-trail")
        );
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total {incomeLabel}</p>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter text-emerald-600">₹{totals.income.toLocaleString("en-IN")}</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tight">{entries.filter((e) => e.type === "INCOME").length} records</p>
                </div>
                <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Expenses</p>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter text-rose-600">₹{totals.expense.toLocaleString("en-IN")}</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tight">{entries.filter((e) => e.type === "EXPENSE").length} records</p>
                </div>
                <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Net Balance</p>
                    <h3 className={cn("text-2xl font-black text-slate-900 tracking-tighter", totals.balance < 0 ? "text-rose-600" : "text-emerald-600")}>
                        ₹{totals.balance.toLocaleString("en-IN")}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tight">{totals.balance < 0 ? "Overspent" : "Healthy"}</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 sm:p-8 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50/30">
                    <div className="relative w-full xl:max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search donors, items, or events..."
                            className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all shadow-sm"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={handleExport}
                            disabled={filtered.length === 0}
                            className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-saffron-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export CSV
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={filtered.length === 0}
                            className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download PDF
                        </button>
                        {(["ALL", "INCOME", "EXPENSE"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => { setFilter(f); setPage(1); }}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center gap-2",
                                    filter === f
                                        ? f === "INCOME" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100"
                                        : f === "EXPENSE" ? "bg-rose-500 text-white shadow-lg shadow-rose-100"
                                        : "bg-slate-900 text-white shadow-lg shadow-slate-200"
                                        : "bg-white text-slate-400 border border-slate-100 hover:bg-slate-50"
                                )}
                            >
                                {f === "INCOME" && <TrendingUp className="w-3.5 h-3.5" />}
                                {f === "EXPENSE" && <TrendingDown className="w-3.5 h-3.5" />}
                                {f === "ALL" ? "All Transactions" : f === "INCOME" ? incomeLabel : "Expenses"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Description</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Payment</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Activity By</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {pageItems.map((entry) => (
                                <tr key={entry.id} className="group hover:bg-slate-50/30 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="text-sm font-bold text-slate-900">
                                            {new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                            {new Date(entry.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border shadow-sm shrink-0",
                                                entry.type === "INCOME" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                            )}>
                                                {entry.type === "INCOME" ? "+" : "-"}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-black text-slate-900 group-hover:text-saffron-600 transition-colors uppercase tracking-tight">
                                                    {entry.title}
                                                </div>
                                                {entry.detail && (
                                                    <div className="text-[10px] text-slate-400 font-normal normal-case mt-0.5 truncate max-w-[320px]">{entry.detail}</div>
                                                )}
                                                {entry.eventTitle && (
                                                    <div className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-0.5">{entry.eventTitle}</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                                            {entry.category}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{entry.paymentMode || "—"}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        {entry.type === "EXPENSE" ? (
                                            <StatusBadge status={entry.status} />
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Received
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-900">{entry.source}</span>
                                            {entry.actor && entry.actor !== entry.source && (
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{entry.actor}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className={cn(
                                            "text-base font-black tracking-tight",
                                            entry.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {entry.type === "INCOME" ? "+" : "-"}₹{entry.amount.toLocaleString("en-IN")}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {pageItems.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-8 py-32 text-center text-slate-400 font-bold uppercase tracking-widest">
                                        No records found for the current selection
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} records
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={safePage <= 1}
                            onClick={() => setPage(safePage - 1)}
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                        >
                            Prev
                        </button>
                        <span className="text-[10px] font-black text-slate-500 px-2">{safePage} / {totalPages}</span>
                        <button
                            disabled={safePage >= totalPages}
                            onClick={() => setPage(safePage + 1)}
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string | null }) {
    if (status === "APPROVED") {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approved
            </span>
        );
    }
    if (status === "REJECTED") {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <XCircle className="w-3.5 h-3.5" />
                Rejected
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-[10px] font-black uppercase tracking-widest">
            <Clock className="w-3.5 h-3.5" />
            Pending
        </span>
    );
}