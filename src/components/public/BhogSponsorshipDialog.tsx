"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sponsorBhogAction } from "@/actions/public-bhog.actions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Soup, Loader2, CheckCircle2 } from "lucide-react";
import { BhogOfferingWindow, OrganizationStatus } from "@prisma/client";
import {
    formatDateInput,
    getAvailablePrasadWindows,
    getNextAvailablePrasadDate,
    PrasadWindowConfig
} from "@/lib/prasad-windows";

const BhogFormSchema = z.object({
    name: z.string().min(2, "Item name is required"),
    quantity: z.string().min(1, "Quantity is required"),
    sponsorName: z.string().min(2, "Your name is required"),
    offeringDate: z.string().min(1, "Offering date is required"),
    offeringWindow: z.nativeEnum(BhogOfferingWindow),
});

type BhogFormData = z.infer<typeof BhogFormSchema>;

interface BhogSponsorshipDialogProps {
    organizationId: string;
    OrganizationName: string;
    festivalStartDate: Date;
    festivalEndDate: Date | null;
    festivalStatus: OrganizationStatus;
    prasadWindowConfig: PrasadWindowConfig;
}

export default function BhogSponsorshipDialog({
    organizationId,
    OrganizationName,
    festivalStartDate,
    festivalEndDate,
    festivalStatus,
    prasadWindowConfig,
}: BhogSponsorshipDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const defaultDate = formatDateInput(getNextAvailablePrasadDate({
        festivalStartDate: new Date(festivalStartDate),
        festivalEndDate: festivalEndDate ? new Date(festivalEndDate) : null,
        config: prasadWindowConfig,
        status: festivalStatus,
    }));

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<BhogFormData>({
        resolver: zodResolver(BhogFormSchema),
        defaultValues: {
            offeringDate: defaultDate,
            offeringWindow: BhogOfferingWindow.MORNING,
        },
    });
    const selectedDate = watch("offeringDate") || defaultDate;
    const availableWindows = useMemo(() => getAvailablePrasadWindows({
            selectedDate: selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date(),
            festivalStartDate: new Date(festivalStartDate),
            festivalEndDate: festivalEndDate ? new Date(festivalEndDate) : null,
            config: prasadWindowConfig,
            status: festivalStatus,
        }),
        [selectedDate, festivalStartDate, festivalEndDate, prasadWindowConfig, festivalStatus]
    );
    const isFestivalEnded = festivalStatus === OrganizationStatus.ENDED;

    useEffect(() => {
        if (availableWindows[0]) setValue("offeringWindow", availableWindows[0].value);
    }, [selectedDate, availableWindows, setValue]);

    const onSubmit = async (data: BhogFormData) => {
        setIsPending(true);
        setError(null);
        try {
            const result = await sponsorBhogAction({
                ...data,
                organizationId,
            });

            if (result.error) {
                setError(result.error);
            } else {
                setIsSuccess(true);
                setTimeout(() => {
                    setOpen(false);
                    setIsSuccess(false);
                    reset();
                }, 2000);
            }
        } catch (e) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    disabled={isFestivalEnded}
                    className="w-full rounded-2xl bg-saffron-500 hover:bg-saffron-600 text-white shadow-lg shadow-saffron-500/20 py-6 font-black uppercase tracking-widest text-xs disabled:opacity-50"
                >
                    <Soup className="w-4 h-4 mr-2" /> Offer Bhog / Prasad
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl">
                {isSuccess ? (
                    <div className="py-12 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Thank You!</h3>
                        <p className="text-slate-500 font-medium">Your offering has been recorded for {OrganizationName}.</p>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Sponsor Bhog</DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium">
                                Choose a valid offering date and window for your prasad.
                            </DialogDescription>
                        </DialogHeader>
                        {isFestivalEnded && (
                            <div className="p-3 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl border border-amber-100">
                                This festival has ended. New prasad offerings are closed.
                            </div>
                        )}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
                            {error && (
                                <div className="p-3 bg-destructive/10 text-destructive text-xs font-bold rounded-xl border border-destructive/20">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="sponsorName">Your Name</Label>
                                <Input id="sponsorName" placeholder="e.g. Rahul Sharma" {...register("sponsorName")} className="rounded-xl border-slate-200" />
                                {errors.sponsorName && <p className="text-[10px] font-bold text-destructive uppercase tracking-tighter">{errors.sponsorName.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Item to Offer</Label>
                                <Input id="name" placeholder="e.g. Ladoo, Khichdi" {...register("name")} className="rounded-xl border-slate-200" />
                                {errors.name && <p className="text-[10px] font-bold text-destructive uppercase tracking-tighter">{errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input id="quantity" placeholder="e.g. 5kg, 500 Pieces" {...register("quantity")} className="rounded-xl border-slate-200" />
                                {errors.quantity && <p className="text-[10px] font-bold text-destructive uppercase tracking-tighter">{errors.quantity.message}</p>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="offeringDate">Offering Date</Label>
                                    <Input
                                        id="offeringDate"
                                        type="date"
                                        min={formatDateInput(new Date(festivalStartDate))}
                                        max={festivalEndDate ? formatDateInput(new Date(festivalEndDate)) : undefined}
                                        {...register("offeringDate")}
                                        className="rounded-xl border-slate-200"
                                    />
                                    {errors.offeringDate && <p className="text-[10px] font-bold text-destructive uppercase tracking-tighter">{errors.offeringDate.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="offeringWindow">Window</Label>
                                    <select
                                        id="offeringWindow"
                                        {...register("offeringWindow")}
                                        disabled={availableWindows.length === 0}
                                        className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {availableWindows.map((window) => (
                                            <option key={window.value} value={window.value}>{window.label}</option>
                                        ))}
                                    </select>
                                    {availableWindows.length === 0 && (
                                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">No offering windows are available for this date.</p>
                                    )}
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="submit" disabled={isPending || isFestivalEnded || availableWindows.length === 0} className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold h-12">
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Submit Offering"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
