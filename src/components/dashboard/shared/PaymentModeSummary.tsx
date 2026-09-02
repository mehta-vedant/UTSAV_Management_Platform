import { PaymentMode } from "@prisma/client";
import { cn } from "@/lib/utils";

export interface PaymentModeSummaryData {
    total: number;
    breakdown: {
        [PaymentMode.CASH]: number;
        [PaymentMode.UPI]: number;
        [PaymentMode.BANK_TRANSFER]: number;
    };
}

const palette: Record<PaymentMode, { label: string; badge: string; bar: string }> = {
    [PaymentMode.CASH]: { label: "Cash", badge: "text-emerald-600 bg-emerald-50 border-emerald-100", bar: "bg-emerald-500" },
    [PaymentMode.UPI]: { label: "UPI", badge: "text-saffron-600 bg-saffron-50 border-saffron-100", bar: "bg-saffron-500" },
    [PaymentMode.BANK_TRANSFER]: { label: "Bank Transfer", badge: "text-blue-600 bg-blue-50 border-blue-100", bar: "bg-blue-500" },
};

export default function PaymentModeSummary({
    data,
    title,
}: {
    data: PaymentModeSummaryData;
    title: string;
}) {
    const modes: PaymentMode[] = [PaymentMode.CASH, PaymentMode.UPI, PaymentMode.BANK_TRANSFER];
    const rows = modes.map((mode) => {
        const amount = data.breakdown[mode];
        const pct = data.total > 0 ? (amount / data.total) * 100 : 0;
        return { mode, amount, pct, ...palette[mode] };
    });

    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
                <p className="text-lg font-black text-slate-900">₹{data.total.toLocaleString()}</p>
            </div>
            <div className="space-y-3">
                {rows.map(({ mode, label, amount, pct, badge, bar }) => (
                    <div key={mode} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter", badge)}>
                                {label}
                            </span>
                            <span className="text-xs font-black text-slate-700">
                                ₹{amount.toLocaleString()}
                                <span className="ml-1.5 text-[9px] font-bold text-slate-400">({Math.round(pct)}%)</span>
                            </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                            <div className={cn("h-1.5 rounded-full", bar)} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
