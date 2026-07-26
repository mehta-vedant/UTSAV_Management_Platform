"use client";

import { Plus, Users, Utensils, IndianRupee, PieChart, ShieldCheck } from "lucide-react";
import { OrganizationRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import AddExpenseModal from "../expenses/AddExpenseModal";
import RecordDonationModal from "../donations/RecordDonationModal";
import AddBhogModal from "../bhog/AddBhogModal";
import InviteMemberModal from "../members/InviteMemberModal";

// Assuming we wrap the modals in a way that can be triggered or provide the components directly
interface ActionRowProps {
    organizationId: string;
    role: OrganizationRole;
    isFestival?: boolean;
}

export default function ActionRow({ organizationId, role, isFestival = true }: ActionRowProps) {
    const isAdmin = role === OrganizationRole.ADMIN;
    const isTreasurer = role === OrganizationRole.TREASURER || isAdmin;
    const isCommittee = role === OrganizationRole.COMMITTEE_MEMBER || isTreasurer;

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:gap-4">
            {/* Admin/Invites */}
            {isAdmin && (
                <div className="w-full [&_button]:w-full xl:[&_button]:w-auto">
                    <InviteMemberModal organizationId={organizationId} />
                </div>
            )}

            {/* Financials */}
            {isCommittee && (
                <div className="w-full [&_button]:w-full xl:[&_button]:w-auto">
                    <AddExpenseModal organizationId={organizationId} />
                </div>
            )}

            {isTreasurer && (
                <div className="w-full [&_button]:w-full xl:[&_button]:w-auto">
                    <RecordDonationModal organizationId={organizationId} isFestival={isFestival} />
                </div>
            )}

            {/* Logistics - Only for Festivals */}
            {isCommittee && isFestival && (
                <div className="w-full [&_button]:w-full xl:[&_button]:w-auto">
                    <AddBhogModal organizationId={organizationId} />
                </div>
            )}

            {/* Placeholder for future task assignment */}
            {isAdmin && (
                <button
                    disabled
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-60 flex items-center justify-center gap-2 cursor-not-allowed xl:w-auto"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Assign Task
                </button>
            )}
        </div>
    );
}
