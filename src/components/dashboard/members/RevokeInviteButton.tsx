"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { revokeInvitationAction } from "@/actions/member.actions";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RevokeInviteButtonProps {
    invitationId: string;
    organizationId: string;
    email: string;
}

export default function RevokeInviteButton({
    invitationId,
    organizationId,
    email
}: RevokeInviteButtonProps) {
    const [isRevoking, setIsRevoking] = useState(false);
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const handleRevoke = async () => {
        setIsRevoking(true);
        try {
            const result = await revokeInvitationAction(organizationId, invitationId);
            if (result.success) {
                toast.success(`Invitation for ${email} revoked`);
                setOpen(false);
                router.refresh();
            } else {
                toast.error(result.error || "Failed to revoke invitation");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setIsRevoking(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    disabled={isRevoking}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                >
                    {isRevoking ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Trash2 className="w-3 h-3" />
                    )}
                    Revoke
                </button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] border-slate-200 shadow-2xl max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tighter uppercase text-slate-900">
                        Revoke Invitation?
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium pt-2 text-left">
                        This will permanently cancel the invitation for <strong className="text-slate-900">{email}</strong>.
                        The invite link will no longer be valid.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="pt-6 flex flex-row gap-3 sm:justify-end">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            className="rounded-2xl font-bold uppercase tracking-widest text-[10px] border-slate-200 hover:bg-slate-50 h-10 px-6"
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handleRevoke}
                        disabled={isRevoking}
                        className="rounded-2xl font-bold uppercase tracking-widest text-[10px] bg-red-500 hover:bg-red-600 text-white border-none shadow-lg shadow-red-200 h-10 px-6"
                    >
                        {isRevoking ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin mr-2" />
                                Revoking...
                            </>
                        ) : (
                            "Yes, Revoke"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
