import { Prisma } from "@prisma/client";
import { TrendingUp, TrendingDown, IndianRupee, Target } from "lucide-react";

interface FinancialOverviewCardProps {
    financials: {
        totalDonations: Prisma.Decimal;
        totalExpenses: Prisma.Decimal;
        remainingBalance: Prisma.Decimal;
        fundraisingTarget: Prisma.Decimal | null;
        utilizationRate: number;
        isOverspent: boolean;
    };
}

export default function FinancialOverviewCard({ financials }: FinancialOverviewCardProps) {
    const formatCurrency = (val: Prisma.Decimal | number) =>
        Number(val).toLocaleString("en-IN", {
            maximumFractionDigits: 0,
            style: "currency",
            currency: "INR",
        });

    const isFundraisingTargetSet = Number(financials.fundraisingTarget || 0) > 0;

    return (
        <section className="col-span-1 md:col-span-2 lg:col-span-3 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Overview</h2>
                    <p className="text-gray-500 text-sm mt-1">Real-time transparency of Organization funds</p>
                </div>
                {financials.isOverspent ? (
                    <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center border border-red-100">
                        <TrendingDown className="w-3 h-3 mr-1" /> Over Budget
                    </span>
                ) : (
                    <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center border border-green-100">
                        <TrendingUp className="w-3 h-3 mr-1" /> Within Budget
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <MetricItem
                    label="Total Collected"
                    value={formatCurrency(financials.totalDonations)}
                    icon={<IndianRupee className="text-green-600" />}
                    sub="Total sponsorship & donations"
                />
                <MetricItem
                    label="Approved Expenses"
                    value={formatCurrency(financials.totalExpenses)}
                    icon={<TrendingDown className="text-red-500" />}
                    sub="Verified vendor payments"
                />
                <MetricItem
                    label="Available Balance"
                    value={formatCurrency(financials.remainingBalance)}
                    icon={<TrendingUp className="text-blue-600" />}
                    sub="Remaining Organization funds"
                    primary
                />
                <MetricItem
                    label="Fundraising Goal"
                    value={!isFundraisingTargetSet ? "Not Set" : formatCurrency(financials.fundraisingTarget || 0)}
                    icon={<Target className="text-orange-500" />}
                    sub="Optional public collection goal"
                />
            </div>

            <div className="mt-10">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-medium text-gray-700">Utilization Progress</span>
                    <span className="text-sm font-bold text-gray-900">{financials.utilizationRate.toFixed(1)}%</span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ease-out ${financials.isOverspent ? 'bg-red-500' : 'bg-gradient-to-r from-orange-400 to-orange-500'
                            }`}
                        style={{ width: `${Math.min(financials.utilizationRate, 100)}%` }}
                    />
                </div>
            </div>
        </section>
    );
}

function MetricItem({ label, value, icon, sub, primary = false }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    sub: string;
    primary?: boolean;
}) {
    return (
        <div className={`p-4 rounded-xl ${primary ? 'bg-blue-50/30' : ''}`}>
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-50">
                    {icon}
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-black text-gray-900 leading-none mb-1">{value}</p>
            <p className="text-[10px] text-gray-400 font-medium">{sub}</p>
        </div>
    );
}
