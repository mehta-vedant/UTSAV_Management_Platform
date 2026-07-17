"use client";

import { Prisma } from "@prisma/client";
import {
    IndianRupee,
    TrendingUp,
    TrendingDown,
    Wallet,
    Target,
    ArrowUpRight,
    ShieldCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

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
    const pathname = usePathname();
    const formatCurrency = (val: Prisma.Decimal | number) =>
        Number(val).toLocaleString("en-IN", {
            maximumFractionDigits: 0,
            style: "currency",
            currency: "INR",
        });

    const isFundraisingTargetSet = Number(financials.fundraisingTarget || 0) > 0;

    return (
        <section className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Total Collected"
                    value={formatCurrency(financials.totalDonations)}
                    icon={<IndianRupee className="w-5 h-5 text-emerald-600" />}
                    description="Opening funds plus donations"
                    trend="up"
                    delay={0.1}
                />
                <StatCard
                    label="Approved Expenses"
                    value={formatCurrency(financials.totalExpenses)}
                    icon={<Wallet className="w-5 h-5 text-red-500" />}
                    description="Verified vendor payments"
                    trend="down"
                    delay={0.2}
                />
                <StatCard
                    label="Available Balance"
                    value={formatCurrency(financials.remainingBalance)}
                    icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
                    description="Collected funds minus expenses"
                    primary
                    delay={0.3}
                />
                <StatCard
                    label="Fundraising Goal"
                    value={!isFundraisingTargetSet ? "Not Set" : formatCurrency(financials.fundraisingTarget || 0)}
                    icon={<Target className="w-5 h-5 text-amber-600" />}
                    description="Optional public collection goal"
                    delay={0.4}
                />
            </div>

            {/* Utilization Progress */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 bg-white/50 backdrop-blur-sm border border-slate-100 rounded-3xl p-8"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-bold text-slate-900">Budget Utilization</h3>
                            {financials.isOverspent ? (
                                <Badge variant="destructive" className="bg-red-500 text-white border-none font-bold px-3 py-0.5 rounded-full">
                                    Over Budget
                                </Badge>
                            ) : (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-3 py-0.5 rounded-full">
                                    On Track
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 font-medium">
                            Organization funds management progress
                        </p>
                    </div>

                    <div className="flex-1 max-w-lg w-full">
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-sm font-black text-slate-900">
                                {financials.utilizationRate.toFixed(1)}% <span className="text-slate-400 font-medium ml-1">Utilized</span>
                            </span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {formatCurrency(financials.totalExpenses)} Spent
                            </span>
                        </div>
                        <Progress
                            value={Math.min(financials.utilizationRate, 100)}
                            className="h-3 bg-slate-100"
                        />
                    </div>

                    <a
                        href={`${pathname}/transparency`}
                        className="inline-flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all hover:shadow-lg hover:shadow-slate-200 group"
                    >
                        <ShieldCheck className="w-4 h-4 text-saffron-500" />
                        View Full Audit Trail
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                </div>
            </motion.div>
        </section>
    );
}

function StatCard({
    label,
    value,
    icon,
    description,
    primary = false,
    trend,
    delay
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    description: string;
    primary?: boolean;
    trend?: "up" | "down";
    delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
            <Card className={`border-none shadow-sm rounded-3xl overflow-hidden group hover:shadow-xl transition-all duration-300 ${primary ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-2xl ${primary ? 'bg-slate-800' : 'bg-slate-50 group-hover:bg-saffron-50 group-hover:text-saffron-600 transition-colors'}`}>
                            {icon}
                        </div>
                        {trend && (
                            <div className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                }`}>
                                {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : null}
                                {trend === 'up' ? 'ACTIVE' : 'AUDITED'}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className={`text-xs font-bold uppercase tracking-widest ${primary ? 'text-slate-400' : 'text-slate-500'}`}>
                            {label}
                        </p>
                        <p className="text-3xl font-black tracking-tight leading-none">
                            {value}
                        </p>
                        <p className={`text-[10px] font-medium pt-2 ${primary ? 'text-slate-500' : 'text-slate-400'}`}>
                            {description}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
