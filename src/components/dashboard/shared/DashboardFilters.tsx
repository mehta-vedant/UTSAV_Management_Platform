import { Search } from "lucide-react";

type FilterOption = {
    value: string;
    label: string;
};

type DashboardFiltersProps = {
    searchPlaceholder?: string;
    statusOptions?: FilterOption[];
    categoryOptions?: FilterOption[];
    current?: {
        search?: string;
        status?: string;
        category?: string;
        dateFrom?: Date;
        dateTo?: Date;
    };
};

export function DashboardFilters({
    searchPlaceholder = "Search records",
    statusOptions = [],
    categoryOptions = [],
    current,
}: DashboardFiltersProps) {
    return (
        <form className="grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto_auto_auto_auto_auto]">
            <label className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                    name="q"
                    defaultValue={current?.search || ""}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                />
            </label>

            {statusOptions.length > 0 && (
                <select name="status" defaultValue={current?.status || ""} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600">
                    <option value="">All Statuses</option>
                    {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            )}

            {categoryOptions.length > 0 && (
                <select name="category" defaultValue={current?.category || ""} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600">
                    <option value="">All Categories</option>
                    {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            )}

            <input name="from" type="date" defaultValue={dateInput(current?.dateFrom)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600" />
            <input name="to" type="date" defaultValue={dateInput(current?.dateTo)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600" />

            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-saffron-500">
                Filter
            </button>
        </form>
    );
}

function dateInput(date?: Date) {
    if (!date) return "";
    return date.toISOString().slice(0, 10);
}
