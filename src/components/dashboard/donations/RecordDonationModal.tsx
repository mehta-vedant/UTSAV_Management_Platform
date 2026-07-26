"use client";

import { useState } from "react";
import { Plus, Loader2, X, IndianRupee, Heart } from "lucide-react";
import { DonationCategory } from "@prisma/client";
import { recordDonationAction } from "@/actions/donation.actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function RecordDonationModal({
    organizationId,
    isFestival = true,
    defaultCategory,
    eventId,
    eventTitle,
}: {
    organizationId: string,
    isFestival?: boolean,
    defaultCategory?: DonationCategory,
    eventId?: string,
    eventTitle?: string,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Simplified categories for Clubs
    const categories = isFestival
        ? Object.values(DonationCategory)
        : [DonationCategory.GENERAL, DonationCategory.SPONSORSHIP, DonationCategory.OTHER];

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            organizationId,
            donorName: formData.get("donorName") as string,
            amount: Number(formData.get("amount")),
            category: (formData.get("category") as DonationCategory) || defaultCategory,
            receivedAt: toIsoDateTime(formData.get("receivedAt") as string),
            eventId,
            notes: formData.get("notes") as string,
        };

        const result = await recordDonationAction(data);

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
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-saffron-500 px-6 py-4 font-bold text-white shadow-xl shadow-saffron-500/20 transition-all hover:bg-saffron-600 active:scale-95 sm:w-auto sm:px-8 sm:hover:scale-105"
            >
                <Plus className="w-5 h-5" />
                {eventId ? "Record Event Donation" : isFestival ? "Record Donation" : "Add Funds"}
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4">
            <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2.5rem] border-t-8 border-saffron-500 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-5 sm:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Heart className="w-4 h-4 text-saffron-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                    {isFestival ? "Traditional Trust" : "Official Funding"}
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                                {eventId ? "Log Event Collection" : isFestival ? "Log Contribution" : "Deposit Funds"}
                            </h2>
                            {eventTitle && (
                                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-saffron-600">
                                    Linked to {eventTitle}
                                </p>
                            )}
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors font-bold uppercase tracking-widest">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="donorName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                {isFestival ? "Donor Full Name" : "Source / Payer Name"}
                            </Label>
                            <Input id="donorName" name="donorName" placeholder={isFestival ? "e.g., Rajesh Sharma" : "e.g., Sponsorship or Treasury"} required className="rounded-xl border-slate-200 h-12 text-sm font-medium" />
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
                                {defaultCategory ? (
                                    <div className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 flex items-center text-xs font-black uppercase tracking-tighter text-slate-500">
                                        {defaultCategory.replace('_', ' ')}
                                        <input type="hidden" name="category" value={defaultCategory} />
                                    </div>
                                ) : (
                                    <select
                                        id="category"
                                        name="category"
                                        required
                                        className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-tighter focus:ring-2 focus:ring-saffron-500 outline-none"
                                    >
                                        {isFestival ? (
                                            Object.values(DonationCategory).map(cat => (
                                                <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                                            ))
                                        ) : (
                                            [DonationCategory.GENERAL, DonationCategory.SPONSORSHIP, DonationCategory.OTHER].map(cat => (
                                                <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                                            ))
                                        )}
                                    </select>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="receivedAt" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Date & Time Received
                            </Label>
                            <Input
                                id="receivedAt"
                                name="receivedAt"
                                type="datetime-local"
                                required
                                defaultValue={localDateTimeValue()}
                                className="rounded-xl border-slate-200 h-12 text-sm font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Record Remarks</Label>
                            <textarea id="notes" name="notes" placeholder="Receipt number or specific intention..." className="w-full rounded-xl border border-slate-200 p-4 text-sm font-medium h-24 focus:ring-2 focus:ring-saffron-500 outline-none resize-none" />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2 italic">
                                <div className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] font-black">!</div>
                                {error}
                            </div>
                        )}

                        <button
                            disabled={isLoading}
                            className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isFestival ? "Save Contribution" : "Submit Fund Entry")}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function localDateTimeValue(date = new Date()) {
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
    return value ? new Date(value).toISOString() : new Date().toISOString();
}
