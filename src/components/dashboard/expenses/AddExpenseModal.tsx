"use client";

import { useState } from "react";
import { Plus, Loader2, X, IndianRupee, Banknote } from "lucide-react";
import { ExpenseCategory, PaymentMode } from "@prisma/client";
import { createExpenseAction } from "@/actions/expense.actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function AddExpenseModal({
    organizationId,
    eventId,
    isFestival = true
}: {
    organizationId: string,
    eventId?: string,
    isFestival?: boolean
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            organizationId,
            eventId,
            title: formData.get("title") as string,
            amount: Number(formData.get("amount")),
            category: formData.get("category") as ExpenseCategory,
            paymentMode: (formData.get("paymentMode") as PaymentMode) || PaymentMode.CASH,
            requestedAt: toIsoDateTime(formData.get("requestedAt") as string),
            notes: formData.get("notes") as string,
        };

        const result = await createExpenseAction(data);

        if (result.success) {
            setIsOpen(false);
        } else {
            setError(result.error);
            setIsLoading(false);
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800 active:scale-95 sm:w-auto sm:px-8 sm:hover:scale-105"
            >
                <Plus className="w-5 h-5" />
                Record Expense
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4">
            <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2.5rem] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-5 sm:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Add Expenditure</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Recording local pavilion spend</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors font-bold uppercase tracking-widest">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Expense Description</Label>
                            <Input id="title" name="title" placeholder="e.g., Flower Decorations for Pandal" required className="rounded-xl border-slate-200 h-12 text-sm font-medium" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount (₹)</Label>
                                <div className="relative">
                                    <Input id="amount" name="amount" type="number" placeholder="0.00" required className="rounded-xl border-slate-200 h-12 text-sm font-medium pl-8" />
                                    <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</Label>
                                <select
                                    id="category"
                                    name="category"
                                    required
                                    className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-tighter focus:ring-2 focus:ring-saffron-500 outline-none"
                                >
                                    {isFestival ? (
                                        [
                                            ExpenseCategory.IDOL,
                                            ExpenseCategory.DECORATION,
                                            ExpenseCategory.LIGHTING,
                                            ExpenseCategory.FOOD,
                                            ExpenseCategory.SOUND,
                                            ExpenseCategory.SECURITY,
                                            ExpenseCategory.MISCELLANEOUS
                                        ].map(cat => (
                                            <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                                        ))
                                    ) : (
                                        [
                                            ExpenseCategory.EQUIPMENT,
                                            ExpenseCategory.MARKETING,
                                            ExpenseCategory.INFRASTRUCTURE,
                                            ExpenseCategory.TRAVEL,
                                            ExpenseCategory.RENTAL,
                                            ExpenseCategory.OPERATIONS,
                                            ExpenseCategory.MISCELLANEOUS
                                        ].map(cat => (
                                            <option key={cat} value={cat === ExpenseCategory.MISCELLANEOUS ? "Other" : cat.replace('_', ' ')}>{cat === ExpenseCategory.MISCELLANEOUS ? "Other" : cat.replace('_', ' ')}</option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="paymentMode" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Payment Mode
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: PaymentMode.CASH, label: "Cash", icon: Banknote },
                                    { value: PaymentMode.UPI, label: "UPI", icon: IndianRupee },
                                    { value: PaymentMode.BANK_TRANSFER, label: "Bank", icon: IndianRupee },
                                ].map(({ value, label, icon: Icon }) => (
                                    <label
                                        key={value}
                                        className="flex items-center justify-center gap-2 h-12 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-tighter cursor-pointer transition-all hover:border-saffron-300 has-[:checked]:border-saffron-500 has-[:checked]:bg-saffron-50 has-[:checked]:text-saffron-700"
                                    >
                                        <input type="radio" name="paymentMode" value={value} defaultChecked={value === PaymentMode.CASH} className="sr-only" />
                                        <Icon className="w-3.5 h-3.5" />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="requestedAt" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Expense Date & Time
                            </Label>
                            <Input
                                id="requestedAt"
                                name="requestedAt"
                                type="datetime-local"
                                required
                                defaultValue={localDateTimeValue()}
                                className="rounded-xl border-slate-200 h-12 text-sm font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Additional Notes</Label>
                            <textarea id="notes" name="notes" placeholder="Any specific vendor details or remarks..." className="w-full rounded-xl border border-slate-200 p-4 text-sm font-medium h-24 focus:ring-2 focus:ring-saffron-500 outline-none resize-none" />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2 italic">
                                <XCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            disabled={isLoading}
                            className="w-full h-14 bg-saffron-500 hover:bg-saffron-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-saffron-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Request"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function XCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
        </svg>
    )
}

function localDateTimeValue(date = new Date()) {
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
    return value ? new Date(value).toISOString() : new Date().toISOString();
}
