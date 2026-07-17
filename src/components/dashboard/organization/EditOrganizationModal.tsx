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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateOrganizationAction, deleteOrganizationAction, endFestivalAction } from "@/actions/organization.actions";
import { Trash2, AlertTriangle, Settings, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EditOrganizationModalProps {
    organization: {
        id: string;
        name: string;
        description: string | null;
        startDate: Date;
        endDate: Date | null;
        openingBalance: number | null;
        publicFundraisingTarget: number | null;
        internalBudgetLimit: number | null;
        type: "FESTIVAL" | "CLUB";
        status?: "ACTIVE" | "ENDED";
        prasadMorningStart?: string;
        prasadMorningEnd?: string;
        prasadEveningStart?: string;
        prasadEveningEnd?: string;
    };
    trigger?: React.ReactNode;
    canEndFestival?: boolean;
}

export default function EditOrganizationModal({
    organization,
    trigger,
    canEndFestival = false
}: EditOrganizationModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!window.confirm("CRITICAL: This will permanently delete the organization and all its data. This action cannot be undone. Are you sure?")) {
            return;
        }

        setLoading(true);
        const res = await deleteOrganizationAction(organization.id);
        setLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Organization deleted successfully");
            setOpen(false);
            router.push("/dashboard");
            router.refresh();
        }
    };

    const handleEndFestival = async () => {
        if (!window.confirm("This will end the festival immediately. Public submissions will close, while the public page remains visible as a read-only archive. Continue?")) {
            return;
        }

        setLoading(true);
        const res = await endFestivalAction(organization.id);
        setLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Festival ended");
            setOpen(false);
            router.refresh();
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const input = {
            organizationId: organization.id,
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            startDate: formData.get("startDate") as string,
            endDate: undefined,
            openingBalance: formData.get("openingBalance") ? Number(formData.get("openingBalance")) : undefined,
            publicFundraisingTarget: formData.get("publicFundraisingTarget") ? Number(formData.get("publicFundraisingTarget")) : undefined,
            internalBudgetLimit: formData.get("internalBudgetLimit") ? Number(formData.get("internalBudgetLimit")) : undefined,
            prasadMorningStart: formData.get("prasadMorningStart") as string,
            prasadMorningEnd: formData.get("prasadMorningEnd") as string,
            prasadEveningStart: formData.get("prasadEveningStart") as string,
            prasadEveningEnd: formData.get("prasadEveningEnd") as string,
        };

        const res = await updateOrganizationAction(input);

        setLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Organization updated");
            setOpen(false);
            router.refresh();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-h-[90vh]">
                <ScrollArea className="max-h-[90vh]">
                    <div className="bg-slate-900 p-8 text-white relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        <DialogHeader className="relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-slate-800 rounded-xl">
                                    <Settings className="w-5 h-5 text-indigo-400" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                    Global Configuration
                                </span>
                            </div>
                            <DialogTitle className="text-3xl font-black tracking-tighter uppercase">
                                Edit Organization
                            </DialogTitle>
                        </DialogHeader>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Organization Name</Label>
                                <Input
                                    name="name"
                                    defaultValue={organization.name}
                                    required
                                    className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all h-12 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Starts At</Label>
                                    <Input
                                        name="startDate"
                                        type="date"
                                        defaultValue={format(new Date(organization.startDate), "yyyy-MM-dd")}
                                        required
                                        className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all h-12 font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ends At</Label>
                                    <Input
                                        value={organization.endDate ? format(new Date(organization.endDate), "yyyy-MM-dd") : "Active"}
                                        readOnly
                                        className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 font-medium text-slate-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    {organization.type === "FESTIVAL" ? "Opening Balance (₹)" : "Starting Allocation (₹)"}
                                </Label>
                                <Input
                                    name="openingBalance"
                                    type="number"
                                    step="0.01"
                                    defaultValue={organization.openingBalance ? Number(organization.openingBalance) : ""}
                                    placeholder="Internal starting funds"
                                    className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all h-12 font-medium"
                                />
                            </div>

                            {organization.type === "FESTIVAL" ? (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Public Fundraising Goal (₹)</Label>
                                    <Input
                                        name="publicFundraisingTarget"
                                        type="number"
                                        step="0.01"
                                        defaultValue={organization.publicFundraisingTarget ? Number(organization.publicFundraisingTarget) : ""}
                                        placeholder="Optional public goal"
                                        className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all h-12 font-medium"
                                    />
                                    <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50/60 p-4 space-y-4">
                                        <div>
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Prasad Offering Windows</Label>
                                            <p className="text-[10px] text-slate-400 font-medium ml-1 mt-1">Users can submit anytime, but only for windows that have not ended.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Morning Opens</Label>
                                                <Input name="prasadMorningStart" type="time" defaultValue={organization.prasadMorningStart || "08:00"} className="rounded-2xl border-slate-100 bg-white h-12 font-medium" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Morning Closes</Label>
                                                <Input name="prasadMorningEnd" type="time" defaultValue={organization.prasadMorningEnd || "11:00"} className="rounded-2xl border-slate-100 bg-white h-12 font-medium" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Evening Opens</Label>
                                                <Input name="prasadEveningStart" type="time" defaultValue={organization.prasadEveningStart || "17:00"} className="rounded-2xl border-slate-100 bg-white h-12 font-medium" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Evening Closes</Label>
                                                <Input name="prasadEveningEnd" type="time" defaultValue={organization.prasadEveningEnd || "20:00"} className="rounded-2xl border-slate-100 bg-white h-12 font-medium" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Internal Budget Limit (₹)</Label>
                                    <Input
                                        name="internalBudgetLimit"
                                        type="number"
                                        step="0.01"
                                        defaultValue={organization.internalBudgetLimit ? Number(organization.internalBudgetLimit) : ""}
                                        placeholder="Optional private cap"
                                        className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all h-12 font-medium"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</Label>
                                <Textarea
                                    name="description"
                                    defaultValue={organization.description || ""}
                                    placeholder="Purpose and mission..."
                                    className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all min-h-[100px] font-medium resize-none text-sm"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex flex-col gap-4">
                            <Button
                                disabled={loading}
                                type="submit"
                                className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-2xl h-14 font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200"
                            >
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>

                            <div className="mt-4 pt-6 border-t border-slate-100">
                                <div className="bg-red-50/50 rounded-2xl p-6 border border-red-100/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="w-4 h-4 text-red-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Danger Zone</span>
                                    </div>
                                    <p className="text-[10px] text-red-500 font-bold mb-4 leading-relaxed">
                                        Permanently delete this organization, including all its financial records, members, and event data.
                                    </p>
                                    {canEndFestival && organization.type === "FESTIVAL" && organization.status !== "ENDED" && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleEndFestival}
                                            disabled={loading}
                                            className="w-full mb-3 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl h-12 font-bold text-xs"
                                        >
                                            <Lock className="w-4 h-4 mr-2" />
                                            End Festival Now
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleDelete}
                                        disabled={loading}
                                        className="w-full border-red-200 text-red-600 hover:bg-red-50 rounded-xl h-12 font-bold text-xs group"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2 group-hover:animate-bounce" />
                                        Delete Organization
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
