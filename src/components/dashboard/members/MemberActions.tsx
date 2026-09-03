"use client";

import { useState } from "react";
import { MoreVertical, Shield, Coins, User, Users, Trash2, Loader2, KeyRound, Copy, Check } from "lucide-react";
import { OrganizationRole } from "@prisma/client";
import {
    updateMemberRoleAction,
    archiveMemberAction,
    resetMemberPasswordAction
} from "@/actions/member.actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function MemberActions({
    memberId,
    currentRole,
    organizationId,
    isSelf
}: {
    memberId: string;
    currentRole: OrganizationRole;
    organizationId: string;
    isSelf: boolean;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const [resetOpen, setResetOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    async function handleRoleUpdate(role: OrganizationRole) {
        if (role === currentRole) return;
        setIsLoading(true);
        const res = await updateMemberRoleAction(organizationId, memberId, role);
        if (res.success) {
            toast.success(`Role updated to ${role.replaceAll("_", " ").toLowerCase()}`);
            setIsOpen(false);
        } else {
            toast.error(res.error || "Failed to update role");
        }
        setIsLoading(false);
    }

    async function handleArchive() {
        if (isSelf) return;
        if (!confirm("Are you sure you want to remove this member? Their access will be revoked immediately.")) return;

        setIsLoading(true);
        const res = await archiveMemberAction(organizationId, memberId);
        if (res.success) {
            setIsOpen(false);
            toast.success("Member removed");
        } else {
            toast.error(res.error || "Failed to remove member");
        }
        setIsLoading(false);
    }

    async function handleResetPassword() {
        setIsOpen(false);
        setTempPassword(null);
        setCopied(false);
        setResetOpen(true);
        setIsResetting(true);
        try {
            const res = await resetMemberPasswordAction(organizationId, memberId);
            if (res.success) {
                setTempPassword(res.data.temporaryPassword);
            } else {
                toast.error(res.error || "Failed to reset password");
                setResetOpen(false);
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
            setResetOpen(false);
        } finally {
            setIsResetting(false);
        }
    }

    function handleCopy() {
        if (!tempPassword) return;
        navigator.clipboard.writeText(tempPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <>
            <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenu.Trigger asChild>
                    <button
                        disabled={isLoading}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 group-hover:text-slate-600 disabled:opacity-50 outline-none"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        align="end"
                        sideOffset={5}
                        className="w-56 rounded-2xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right border border-slate-100 p-2"
                    >
                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Change Role</div>

                        {[
                            { role: OrganizationRole.ADMIN, label: "Admin", icon: Shield },
                            { role: OrganizationRole.TREASURER, label: "Treasurer", icon: Coins },
                            { role: OrganizationRole.COMMITTEE_MEMBER, label: "Committee", icon: Users },
                            { role: OrganizationRole.VOLUNTEER, label: "Volunteer", icon: User },
                        ].map((item) => (
                            <DropdownMenu.Item
                                key={item.role}
                                onClick={() => handleRoleUpdate(item.role)}
                                className={cn(
                                    "w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors outline-none cursor-pointer",
                                    currentRole === item.role
                                        ? "bg-saffron-50 text-saffron-600 font-black"
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </DropdownMenu.Item>
                        ))}

                        {!isSelf && (
                            <>
                                <div className="h-px bg-slate-50 my-2" />
                                <DropdownMenu.Item
                                    onClick={handleResetPassword}
                                    className="w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 text-slate-700 hover:bg-slate-50 transition-colors outline-none cursor-pointer"
                                >
                                    <KeyRound className="w-4 h-4" />
                                    Reset Password
                                </DropdownMenu.Item>
                                <div className="h-px bg-slate-50 my-2" />
                                <DropdownMenu.Item
                                    onClick={handleArchive}
                                    className="w-full text-left px-3 py-2.5 text-xs font-black rounded-xl flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors uppercase tracking-widest outline-none cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Remove Member
                                </DropdownMenu.Item>
                            </>
                        )}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                <DialogContent className="rounded-[2.5rem] border-slate-200 shadow-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase text-slate-900">
                            Reset Password
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium pt-2 text-left">
                            A temporary password has been set. Share it with the member — they can use it to sign in and
                            change it later.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {isResetting ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-6 h-6 text-saffron-500 animate-spin" />
                            </div>
                        ) : tempPassword ? (
                            <>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                        Temporary Password
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <code className="text-lg font-black text-slate-900 tracking-wide break-all select-all">
                                            {tempPassword}
                                        </code>
                                        <button
                                            onClick={handleCopy}
                                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-saffron-600 hover:border-saffron-200 transition-colors shrink-0"
                                            aria-label="Copy password"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 font-medium">
                                    Make sure to send this to the member securely. Anyone with this password can sign in
                                    to their account.
                                </div>
                            </>
                        ) : null}
                    </div>

                    <DialogFooter className="pt-6 flex flex-row gap-3 sm:justify-end">
                        <Button
                            onClick={() => setResetOpen(false)}
                            disabled={isResetting}
                            className="rounded-2xl font-bold uppercase tracking-widest text-[10px] bg-slate-900 hover:bg-slate-800 text-white h-10 px-6"
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
