"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, X, Utensils, User } from "lucide-react";
import { createBhogAction } from "@/actions/bhog.actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BhogOfferingWindow } from "@prisma/client";
import { formatDateInput } from "@/lib/prasad-windows";

export default function AddBhogModal({ organizationId }: { organizationId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            organizationId,
            name: formData.get("name") as string,
            quantity: formData.get("quantity") as string,
            offeringDate: formData.get("offeringDate") as string,
            offeringWindow: formData.get("offeringWindow") as BhogOfferingWindow,
            storage: formData.get("storage") as string,
            sponsorName: formData.get("sponsorName") as string,
        };

        const result = await createBhogAction(data);

        if (result.success) {
            setIsOpen(false);
            setIsLoading(false);
            router.refresh();
        } else {
            setError(result.error);
            setIsLoading(false);
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800 active:scale-95 sm:w-auto sm:px-8 sm:hover:scale-105"
            >
                <Plus className="w-5 h-5" />
                Add Bhog Entry
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4">
            <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2.5rem] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-5 sm:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Utensils className="w-4 h-4 text-saffron-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Board Management</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">New Bhog Entry</h2>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Prasadam / Item Name</Label>
                            <Input id="name" name="name" placeholder="e.g., Ladoo (5kg)" required className="rounded-xl border-slate-200 h-12 text-sm font-medium" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="quantity" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quantity / Count</Label>
                                <Input id="quantity" name="quantity" placeholder="e.g., 50 Units" required className="rounded-xl border-slate-200 h-12 text-sm font-medium" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="storage" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Storage Location</Label>
                                <Input id="storage" name="storage" placeholder="e.g., Room 101" className="rounded-xl border-slate-200 h-12 text-sm font-medium" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="offeringDate" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Offering Date</Label>
                                <Input id="offeringDate" name="offeringDate" type="date" defaultValue={formatDateInput(new Date())} required className="rounded-xl border-slate-200 h-12 text-sm font-medium" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="offeringWindow" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Window</Label>
                                <select id="offeringWindow" name="offeringWindow" defaultValue={BhogOfferingWindow.MORNING} className="flex h-12 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm font-medium">
                                    <option value={BhogOfferingWindow.MORNING}>Morning</option>
                                    <option value={BhogOfferingWindow.EVENING}>Evening</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sponsorName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sponsor Name</Label>
                            <div className="relative">
                                <Input id="sponsorName" name="sponsorName" placeholder="Donor Name" required className="rounded-xl border-slate-200 h-12 text-sm font-medium pl-10" />
                                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2 italic">
                                <X className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            disabled={isLoading}
                            className="w-full h-14 bg-saffron-500 hover:bg-saffron-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-saffron-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register Entry"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
