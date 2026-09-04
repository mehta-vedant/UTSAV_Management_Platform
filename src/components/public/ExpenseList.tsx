import { Prisma } from "@prisma/client";
import { Calendar, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExpenseListProps {
    expenses: {
        id: string;
        title: string;
        amount: Prisma.Decimal;
        category: string;
        paymentMode: string | null;
        createdAt: Date;
    }[];
    orgSlug: string;
}

export default function ExpenseList({ expenses, orgSlug }: ExpenseListProps) {
    return (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white h-full flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Approved Expenses</CardTitle>
            </CardHeader>

            <CardContent className="flex-1 px-6 pb-6">
                <div className="space-y-4">
                    {expenses.map((e) => (
                        <div key={e.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/40">
                            <div className="min-w-0">
                                <h4 className="truncate text-sm font-bold text-slate-900">{e.title}</h4>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <Badge variant="secondary" className="bg-white text-[9px] font-black uppercase text-slate-500 border-slate-100">
                                        {e.category}
                                    </Badge>
                                    {e.paymentMode && (
                                        <Badge variant="secondary" className="bg-white text-[9px] font-black uppercase text-blue-500 border-blue-100">
                                            {e.paymentMode.replace("_", " ")}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-sm font-black text-rose-600 leading-none">-₹{Number(e.amount).toLocaleString("en-IN")}</p>
                                <span className="mt-1 block text-[10px] font-bold text-slate-400">
                                    <Calendar className="mr-1 inline h-2.5 w-2.5" />
                                    {new Date(e.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        </div>
                    ))}

                    {expenses.length === 0 && (
                        <div className="py-16 text-center text-sm font-bold text-slate-400 uppercase tracking-tight bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                            No approved expenses yet
                        </div>
                    )}
                </div>

                <a
                    href={`/${orgSlug}/expenses`}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:border-saffron-300 hover:text-saffron-600 hover:bg-saffron-50"
                >
                    View All Expenses
                    <ArrowRight className="h-3.5 w-3.5" />
                </a>
            </CardContent>
        </Card>
    );
}
