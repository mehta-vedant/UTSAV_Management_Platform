"use client";

import { useState } from "react";
import {
    Search,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    ArrowUpDown,
    Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AuditEntry {
    id: string;
    type: "INCOME" | "EXPENSE";
    source: string;
    title: string;
    amount: number;
    date: Date;
    category: string;
    verified: boolean;
}

interface AuditTableProps {
    entries: AuditEntry[];
}

export default function AuditTable({ entries }: AuditTableProps) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

    const filteredEntries = entries.filter(e => {
        const matchesSearch =
            e.title.toLowerCase().includes(search.toLowerCase()) ||
            e.source.toLowerCase().includes(search.toLowerCase()) ||
            e.category.toLowerCase().includes(search.toLowerCase());

        const matchesFilter = filter === "ALL" || e.type === filter;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Toolbar */}
            <div className="p-5 sm:p-8 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50/30">
                <div className="relative w-full xl:max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search donors, items, or categories..."
                        className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 xl:flex xl:items-center gap-2 w-full xl:w-auto">
                    <button
                        onClick={() => setFilter("ALL")}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap w-full",
                            filter === "ALL"
                                ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                                : "bg-white text-slate-400 border border-slate-100 hover:bg-slate-50"
                        )}
                    >
                        All Transactions
                    </button>
                    <button
                        onClick={() => setFilter("INCOME")}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center gap-2 w-full",
                            filter === "INCOME"
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100"
                                : "bg-white text-slate-400 border border-slate-100 hover:bg-emerald-50 hover:text-emerald-600"
                        )}
                    >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Donations
                    </button>
                    <button
                        onClick={() => setFilter("EXPENSE")}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center gap-2 w-full",
                            filter === "EXPENSE"
                                ? "bg-rose-500 text-white shadow-lg shadow-rose-100"
                                : "bg-white text-slate-400 border border-slate-100 hover:bg-rose-50 hover:text-rose-600"
                        )}
                    >
                        <TrendingDown className="w-3.5 h-3.5" />
                        Expenses
                    </button>
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
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredEntries.map((entry) => (
                            <tr key={entry.id} className="group hover:bg-slate-50/30 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="text-sm font-bold text-slate-900">
                                        {format(new Date(entry.date), "MMM d, yyyy")}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                        {format(new Date(entry.date), "hh:mm a")}
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border shadow-sm",
                                            entry.type === "INCOME"
                                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                : "bg-rose-50 text-rose-600 border-rose-100"
                                        )}>
                                            {entry.type === "INCOME" ? "+" : "-"}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-slate-900 group-hover:text-saffron-600 transition-colors uppercase tracking-tight">
                                                {entry.title}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                By {entry.source}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                                        {entry.category}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Audited
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className={cn(
                                        "text-base font-black tracking-tight",
                                        entry.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        {entry.type === "INCOME" ? "+" : "-"} ₹{entry.amount.toLocaleString("en-IN")}
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {filteredEntries.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-8 py-32 text-center text-slate-400 font-bold uppercase tracking-widest">
                                    No records found for the current selection
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Table Footer */}
            <div className="p-8 bg-slate-50/50 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    Digital Audit Trail Provided by UTSAV Platform • Real-time Data
                </p>
            </div>
        </div>
    );
}
