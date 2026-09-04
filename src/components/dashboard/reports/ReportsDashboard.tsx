"use client";

import Link from "next/link";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
} from "recharts";
import { Download, TrendingUp, TrendingDown, Wallet, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { csvDownloadBlob, downloadBlob, toCsv, formatAmountForCsv } from "@/lib/export";
import { downloadPdfDocument, pdfFilename } from "@/lib/pdf/download";
import ReportsDocument from "@/lib/pdf/ReportsDocument";
import type { ReportsData } from "@/modules/finance/reports.service";

interface ReportsDashboardProps {
    data: ReportsData;
    orgSlug: string;
    organizationName: string;
    currentBucket: "daily" | "weekly" | "monthly";
    isFestival: boolean;
}

const COLORS = [
    "#f59e0b", // saffron
    "#10b981", // emerald
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#f43f5e", // rose
    "#0ea5e9", // sky
    "#84cc16", // lime
    "#f97316", // orange
    "#14b8a6", // teal
    "#6366f1", // indigo
];

function fmt(value: number) {
    return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export default function ReportsDashboard({ data, orgSlug, organizationName, currentBucket, isFestival }: ReportsDashboardProps) {
    const incomeLabel = isFestival ? "Donations" : "Income";
    const { totals } = data;

    const csvActions = [
        {
            label: "Cash Flow",
            filename: "cash-flow.csv",
            exportFn: () =>
                toCsv(
                    data.cashFlow.map((p) => ({
                        period: p.label,
                        income: formatAmountForCsv(p.income),
                        expense: formatAmountForCsv(p.expense),
                        balance: formatAmountForCsv(p.balance),
                    })),
                    ["period", "income", "expense", "balance"]
                ),
        },
        {
            label: `${incomeLabel} by Category`,
            filename: "donation-categories.csv",
            exportFn: () =>
                toCsv(
                    data.donationCategories.map((c) => ({
                        category: c.category,
                        amount: formatAmountForCsv(c.amount),
                        count: c.count,
                    })),
                    ["category", "amount", "count"]
                ),
        },
        {
            label: "Expenses by Category",
            filename: "expense-categories.csv",
            exportFn: () =>
                toCsv(
                    data.expenseCategories.map((c) => ({
                        category: c.category,
                        amount: formatAmountForCsv(c.amount),
                        count: c.count,
                    })),
                    ["category", "amount", "count"]
                ),
        },
        {
            label: "Event Budget Utilization",
            filename: "event-budgets.csv",
            exportFn: () =>
                toCsv(
                    data.eventBudgets.map((e) => ({
                        event: e.title,
                        budget: formatAmountForCsv(e.budgetTarget),
                        spent: formatAmountForCsv(e.spent),
                        remaining: formatAmountForCsv(e.remaining),
                        utilization: e.utilization.toFixed(1),
                    })),
                    ["event", "budget", "spent", "remaining", "utilization"]
                ),
        },
    ];

    const bucketLabel = currentBucket === "monthly" ? "Monthly" : currentBucket === "weekly" ? "Weekly" : "Daily";

    const handleDownloadPdf = () => {
        void downloadPdfDocument(
            <ReportsDocument
                organizationName={organizationName}
                incomeLabel={incomeLabel}
                bucketLabel={bucketLabel}
                generatedAt={new Date()}
                data={data as any}
            />,
            pdfFilename("financial-reports")
        );
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label={`Total ${incomeLabel}`}
                    value={fmt(totals.totalDonations)}
                    sub={`${totals.donationCount} ${incomeLabel.toLowerCase()} records`}
                    tone="emerald"
                />
                <StatCard
                    icon={<TrendingDown className="w-4 h-4" />}
                    label="Approved Expenses"
                    value={fmt(totals.totalApprovedExpenses)}
                    sub={`${totals.approvedExpenseCount} approved records`}
                    tone="rose"
                />
                <StatCard
                    icon={<Wallet className="w-4 h-4" />}
                    label="Net Balance"
                    value={fmt(totals.balance)}
                    sub={totals.balance < 0 ? "Overspent" : "Healthy"}
                    tone={totals.balance < 0 ? "rose" : "emerald"}
                />
            </div>

            {/* Export toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-saffron-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Export Report Data</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {csvActions.map((action) => (
                        <button
                            key={action.label}
                            onClick={() => {
                                downloadBlob(csvDownloadBlob(action.exportFn()), action.filename);
                            }}
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-saffron-500 transition-colors"
                        >
                            {action.label} · CSV
                        </button>
                    ))}
                    <button
                        onClick={handleDownloadPdf}
                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Download Report PDF
                    </button>
                </div>
            </div>

            {/* Cash Flow */}
            <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div>
                        <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Cash Flow Over Time</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Income vs Expenses</p>
                    </div>
                    <BucketToggle current={currentBucket} orgSlug={orgSlug} />
                </div>
                <CashFlowChart data={data.cashFlow} />
            </section>

            {/* Category Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900">{incomeLabel} by Category</h3>
                    <CategoryPie data={data.donationCategories} />
                </section>
                <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Expenses by Category</h3>
                    <CategoryPie data={data.expenseCategories} />
                </section>
            </div>

            {/* Payment modes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900">{incomeLabel} by Payment Mode</h3>
                    <PaymentModeBars data={data.incomePaymentModes} />
                </section>
                <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Expenses by Payment Mode</h3>
                    <PaymentModeBars data={data.expensePaymentModes} />
                </section>
            </div>

            {/* Event budgets */}
            <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                    <div>
                        <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Event Budget Utilization</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {totals.eventCount} event(s) · budget vs approved spend
                        </p>
                    </div>
                    <Link
                        href={`/${orgSlug}/dashboard/events`}
                        className="text-[10px] font-black uppercase tracking-widest text-saffron-600 hover:text-saffron-700"
                    >
                        Manage Events
                    </Link>
                </div>
                {data.eventBudgets.length > 0 ? (
                    <EventBudgetBars data={data.eventBudgets} />
                ) : (
                    <EmptyMessage>No events created yet.</EmptyMessage>
                )}
            </section>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    sub,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    tone: "emerald" | "rose";
}) {
    return (
        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center",
                    tone === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                    {icon}
                </span>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            </div>
            <h3 className={cn(
                "text-2xl font-black tracking-tighter",
                tone === "emerald" ? "text-emerald-600" : "text-rose-600"
            )}>
                {value}
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tight">{sub}</p>
        </div>
    );
}

function BucketToggle({ current, orgSlug }: { current: "daily" | "weekly" | "monthly"; orgSlug: string }) {
    const buckets: { value: "daily" | "weekly" | "monthly"; label: string }[] = [
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
    ];
    return (
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {buckets.map((b) => (
                <Link
                    key={b.value}
                    href={`/${orgSlug}/dashboard/reports${b.value === "daily" ? "" : `?bucket=${b.value}`}`}
                    className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors",
                        current === b.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    {b.label}
                </Link>
            ))}
        </div>
    );
}

function CashFlowChart({ data }: { data: ReportsData["cashFlow"] }) {
    if (data.length === 0) return <EmptyMessage>No financial activity recorded yet.</EmptyMessage>;
    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => fmt(Number(value))} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#incomeFill)" />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#f43f5e" strokeWidth={2} fill="url(#expenseFill)" />
            </AreaChart>
        </ResponsiveContainer>
    );
}

function CategoryPie({ data }: { data: ReportsData["donationCategories"] }) {
    const total = data.reduce((sum, d) => sum + d.amount, 0);
    if (data.length === 0 || total <= 0) return <EmptyMessage>No data yet.</EmptyMessage>;
    return (
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={240} className="min-w-0 sm:w-1/2">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        labelLine={false}
                    >
                        {data.map((entry, index) => (
                            <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => fmt(Number(value))} />
                </PieChart>
            </ResponsiveContainer>
            <div className="w-full sm:w-1/2 space-y-2">
                {data.map((entry, index) => {
                    const pct = total > 0 ? (entry.amount / total) * 100 : 0;
                    return (
                        <div key={entry.category} className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-tight text-slate-700">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                {entry.category}
                            </span>
                            <span className="text-[10px] font-black text-slate-500">
                                {fmt(entry.amount)} <span className="text-slate-400">({pct.toFixed(1)}%)</span>
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PaymentModeBars({ data }: { data: { mode: string; amount: number }[] }) {
    const total = data.reduce((sum, d) => sum + d.amount, 0);
    if (total <= 0) return <EmptyMessage>No payment-mode data yet.</EmptyMessage>;
    return (
        <div className="space-y-3">
            {data.map((row) => {
                const pct = total > 0 ? (row.amount / total) * 100 : 0;
                return (
                    <div key={row.mode} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                {row.mode.replace("_", " ")}
                            </span>
                            <span className="text-xs font-black text-slate-700">
                                {fmt(row.amount)} <span className="text-[9px] font-bold text-slate-400">({pct.toFixed(1)}%)</span>
                            </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-saffron-500" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function EventBudgetBars({ data }: { data: ReportsData["eventBudgets"] }) {
    return (
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 48)}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis
                    type="category"
                    dataKey="title"
                    width={160}
                    tick={{ fontSize: 10, fontWeight: 800 }}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    formatter={(value, name) => {
                        const label = String(name ?? "");
                        return [fmt(Number(value)), label.charAt(0).toUpperCase() + label.slice(1)];
                    }}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                <Bar dataKey="budget" name="Budget" fill="#cbd5e1" radius={[0, 6, 6, 0]} />
                <Bar dataKey="spent" name="Spent" fill="#f59e0b" radius={[0, 6, 6, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Inbox className="w-8 h-8 text-slate-300" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{children}</p>
        </div>
    );
}