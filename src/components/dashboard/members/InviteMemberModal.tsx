"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus, X, Loader2 } from "lucide-react";
import { OrganizationRole } from "@prisma/client";
import { inviteMemberAction } from "@/actions/member.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InviteMemberModal({
    organizationId,
    events = []
}: {
    organizationId: string;
    events?: { id: string, title: string }[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [skipEmail, setSkipEmail] = useState(true); // Default to true for faster bypass
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const role = formData.get("role") as OrganizationRole;

        const result = await inviteMemberAction({
            organizationId,
            email,
            role,
            eventId: selectedEventId || undefined,
            skipEmail
        });

        if (result.success) {
            setIsOpen(false);
            setIsLoading(false);
            router.refresh();
        } else {
            setError(result.error || "Failed to invite member");
            setIsLoading(false);
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
            >
                <UserPlus className="w-5 h-5" />
                Invite Member
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Add Committee Member</h2>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                            <Input id="email" name="email" type="email" placeholder="email@example.com" required className="rounded-xl border-slate-200 h-12" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assign Role</Label>
                            <select
                                id="role"
                                name="role"
                                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none"
                                defaultValue={OrganizationRole.VOLUNTEER}
                            >
                                <option value={OrganizationRole.ADMIN}>Admin</option>
                                <option value={OrganizationRole.TREASURER}>Treasurer</option>
                                <option value={OrganizationRole.COMMITTEE_MEMBER}>Committee Member</option>
                                <option value={OrganizationRole.VOLUNTEER}>Volunteer</option>
                            </select>
                        </div>

                        {events.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="eventId" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Linked Event (Optional)</Label>
                                <select
                                    id="eventId"
                                    name="eventId"
                                    className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none"
                                    value={selectedEventId}
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                >
                                    <option value="">No specific event</option>
                                    {events.map(event => (
                                        <option key={event.id} value={event.id}>{event.title}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <input
                                type="checkbox"
                                id="skipEmail"
                                checked={skipEmail}
                                onChange={(e) => setSkipEmail(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-saffron-600 focus:ring-saffron-500"
                            />
                            <Label htmlFor="skipEmail" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider cursor-pointer select-none">
                                Skip Email & Generate Link Only (Fastest)
                            </Label>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 italic">
                                {error}
                            </div>
                        )}

                        <button
                            disabled={isLoading}
                            className="w-full h-12 bg-saffron-500 hover:bg-saffron-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-saffron-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Invitation"}
                        </button>

                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                <strong>Note:</strong> Due to email service (Resend) restrictions in dev mode, emails might not reach every inbox.
                                You can always copy the invite link manually from the "Pending Invitations" section below.
                            </p>
                            <p className="text-[10px] text-amber-600 font-bold mt-2 leading-relaxed bg-amber-50 p-2 rounded-lg border border-amber-100">
                                ⚠️ SAFETY: Share links ONLY with the recipient. We have now added strict email matching to prevent account hijacking.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
