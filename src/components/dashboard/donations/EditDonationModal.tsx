"use client";

import { useState } from "react";
import { Trash2, Edit2, Loader2, X, IndianRupee, Banknote } from "lucide-react";
import { DonationCategory, PaymentMode } from "@prisma/client";
import { updateDonationAction, archiveDonationAction } from "@/actions/donation.actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EditDonationModalProps {
    organizationId: string;
    donation: {
        id: string;
        donorName: string;
        amount: number;
        category: DonationCategory;
        paymentMode: PaymentMode;
        notes?: string | null;
    };
    trigger?: React.ReactNode;
    isFestival?: boolean;
}

export default function EditDonationModal({
    organizationId,
    donation,
    trigger,
    isFestival = true
}: EditDonationModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleDelete() {
        if (!confirm("Are you sure you want to delete this donation record? This action cannot be undone.")) return;

        setIsLoading(true);
        const result = await archiveDonationAction(organizationId, donation.id);

        if (result.success) {
            toast.success("Donation record deleted");
            setIsOpen(false);
            setIsLoading(false);
            router.refresh();
        } else {
            setError(result.error);
            setIsLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            organizationId,
            donationId: donation.id,
            donorName: formData.get("donorName") as string,
            amount: Number(formData.get("amount")),
            category: formData.get("category") as DonationCategory,
            paymentMode: formData.get("paymentMode") as PaymentMode,
            notes: formData.get("notes") as string,
        };

        const result = await updateDonationAction(data);

        if (result.success) {
            toast.success("Donation record updated");
            setIsOpen(false);
            setIsLoading(false);
            router.refresh();
        } else {
            setError(result.error);
            setIsLoading(false);
        }
    }

    return (
        <>
            <div onClick={() => setIsOpen(true)} className="cursor-pointer">
                {trigger || (
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-indigo-600">
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-left">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                                        {isFestival ? "Edit Contribution" : "Update Fund Entry"}
                                    </h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                        {isFestival ? "Update donation details" : "Modify recorded funding"}
                                    </p>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors font-bold uppercase tracking-widest">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="donorName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                        {isFestival ? "Donor Full Name" : "Source Name"}
                                    </Label>
                                    <Input id="donorName" name="donorName" defaultValue={donation.donorName} required className="rounded-xl border-slate-200 h-12 text-sm font-medium" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount (₹)</Label>
                                        <div className="relative">
                                            <Input id="amount" name="amount" type="number" defaultValue={donation.amount} required className="rounded-xl border-slate-200 h-12 text-sm font-medium pl-8" />
                                            <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</Label>
                                        <select
                                            id="category"
                                            name="category"
                                            defaultValue={donation.category}
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
                                                <input type="radio" name="paymentMode" value={value} defaultChecked={value === donation.paymentMode} className="sr-only" />
                                                <Icon className="w-3.5 h-3.5" />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Additional Notes</Label>
                                    <textarea id="notes" name="notes" defaultValue={donation.notes || ""} className="w-full rounded-xl border border-slate-200 p-4 text-sm font-medium h-24 focus:ring-2 focus:ring-saffron-500 outline-none resize-none" />
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2 italic">
                                        <XCircle className="w-4 h-4 shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={isLoading}
                                        className="flex-1 h-14 border-2 border-red-100 bg-white text-red-600 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-[2] h-14 bg-saffron-500 hover:bg-saffron-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-saffron-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
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
