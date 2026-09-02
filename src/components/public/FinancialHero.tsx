import { Prisma } from "@prisma/client";
import { IndianRupee, Receipt, TrendingUp } from "lucide-react";

interface FinancialHeroProps {
    financials: {
        totalDonations: Prisma.Decimal;
        totalExpenses: Prisma.Decimal;
        remainingBalance: Prisma.Decimal;
        fundraisingTarget: Prisma.Decimal | null;
        utilizationRate: number;
        isOverspent: boolean;
    };
}

export default function FinancialHero({ financials }: FinancialHeroProps) {
    const formatCurrency = (val: Prisma.Decimal | number) =>
        Number(val).toLocaleString("en-IN", {
            maximumFractionDigits: 0,
            style: "currency",
            currency: "INR",
        });

    const isFundraisingTargetSet = Number(financials.fundraisingTarget || 0) > 0;

    const stats = [
        { label: "Total Collected", value: formatCurrency(financials.totalDonations), icon: <IndianRupee className="w-5 h-5 text-emerald-600" /> },
        { label: "Approved Expenses", value: formatCurrency(financials.totalExpenses), icon: <Receipt className="w-5 h-5 text-red-500" /> },
        { label: "Available Balance", value: formatCurrency(financials.remainingBalance), valueClass: "text-slate-900", primary: true },
        { label: "Fundraising Goal", value: !isFundraisingTargetSet ? "Not Set" : formatCurrency(financials.fundraisingTarget || 0), icon: <TrendingUp className="w-5 h-5 text-amber-600" /> },
    ];

    return (
        <section className="mb-8 sm:mb-10">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                    <div
                        key={s.label}
                        className={`rounded-3xl p-5 shadow-sm sm:p-6 ${s.primary ? "bg-slate-900 text-white" : "border border-slate-100 bg-white"}`}
                    >
                        {s.icon && <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50">{s.icon}</div>}
                        <p className={`text-xs font-bold uppercase tracking-widest ${s.primary ? "text-slate-400" : "text-slate-500"}`}>
                            {s.label}
                        </p>
                        <p className={`text-2xl font-black leading-none tracking-tight sm:text-3xl ${s.primary ? "text-white" : "text-slate-900"}`}>
                            {s.value}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
