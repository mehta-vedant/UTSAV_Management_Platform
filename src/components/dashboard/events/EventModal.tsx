"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, Loader2, MapPin, Clock } from "lucide-react";
import { createEventAction, updateEventAction } from "@/actions/event.actions";
import { toast } from "sonner";
import { format } from "date-fns";

interface EventModalProps {
    organizationId: string;
    orgSlug: string;
    event?: {
        id: string;
        title: string;
        description: string | null;
        startTime: Date;
        endTime: Date;
        location: string | null;
        isArchived: boolean;
        budgetTarget?: number;
    };
    trigger?: React.ReactNode;
    isFestival?: boolean;
}

export default function EventModal({
    organizationId,
    orgSlug,
    event,
    trigger,
    isFestival = true
}: EventModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const isEditing = !!event;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const input = {
            title: formData.get("title") as string,
            description: formData.get("description") as string,
            location: formData.get("location") as string,
            startTime: new Date(formData.get("startTime") as string),
            endTime: new Date(formData.get("endTime") as string),
            budgetTarget: formData.get("budgetTarget") ? Number(formData.get("budgetTarget")) : undefined,
        };

        let res;
        if (isEditing) {
            res = await updateEventAction(organizationId, orgSlug, event.id, input);
        } else {
            res = await createEventAction(organizationId, orgSlug, input);
        }

        setLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success(isEditing ? "Event updated" : "Event scheduled");
            setOpen(false);

            // Redirect to the event dashboard on creation
            if (!isEditing && (res as any).eventId) {
                router.push(`/${orgSlug}/dashboard/events/${(res as any).eventId}`);
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl px-6 py-6 h-auto transition-all shadow-lg shadow-slate-200 group">
                        <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                        Schedule Event
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
                <div className="bg-slate-900 p-8 text-white relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    <DialogHeader className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-slate-800 rounded-xl">
                                <Calendar className="w-5 h-5 text-amber-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                {isEditing ? "Modify Timeline" : "Pavilion Schedule"}
                            </span>
                        </div>
                        <DialogTitle className="text-3xl font-black tracking-tighter uppercase">
                            {isEditing ? "Edit Event" : "New Event"}
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Event Title</Label>
                            <Input
                                name="title"
                                defaultValue={event?.title}
                                placeholder="e.g., Grand Aarti & Bhajans"
                                required
                                className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all h-12 font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Starts At</Label>
                                <Input
                                    name="startTime"
                                    type="datetime-local"
                                    defaultValue={event?.startTime ? format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm") : undefined}
                                    required
                                    className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all h-12 font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ends At</Label>
                                <Input
                                    name="endTime"
                                    type="datetime-local"
                                    defaultValue={event?.endTime ? format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm") : undefined}
                                    required
                                    className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all h-12 font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Location</Label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    name="location"
                                    defaultValue={event?.location || ""}
                                    placeholder="e.g., Main Sanctum Hall"
                                    className="pl-10 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all h-12 font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                {isFestival ? "Event Spending Limit (₹)" : "Event Allocation (₹)"}
                            </Label>
                            <Input
                                name="budgetTarget"
                                type="number"
                                step="0.01"
                                defaultValue={event?.budgetTarget ? Number(event.budgetTarget) : ""}
                                placeholder={isFestival ? "e.g., 50000" : "e.g., Internal budget allocation"}
                                className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all h-12 font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description / Sequence</Label>
                            <Textarea
                                name="description"
                                defaultValue={event?.description || ""}
                                placeholder="Details about the event flow..."
                                className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all min-h-[100px] font-medium resize-none text-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            disabled={loading}
                            type="submit"
                            className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-2xl h-14 font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200"
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isEditing ? "Save Changes" : "Confirm Schedule"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
