import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveOrgContext } from "@/lib/org-context";
import { Users, Mail, Shield, Trash2, UserPlus, Sparkles } from "lucide-react";
import { OrganizationRole } from "@prisma/client";
import { format } from "date-fns";
import InviteMemberModal from "@/components/dashboard/members/InviteMemberModal";
import RoleBadge from "@/components/dashboard/members/RoleBadge";
import MemberActions from "@/components/dashboard/members/MemberActions";
import CopyInviteLink from "@/components/dashboard/members/CopyInviteLink";
import ShareOnWhatsApp from "@/components/dashboard/members/ShareOnWhatsApp";
import RevokeInviteButton from "@/components/dashboard/members/RevokeInviteButton";

export default async function MembersPage({ params }: { params: { orgSlug: string } }) {
    const { organization, member, isAdmin } = await resolveOrgContext(params.orgSlug);

    const members = await prisma.organizationMember.findMany({
        where: {
            organizationId: organization.id,
            isArchived: false,
        },
        include: {
            user: {
                select: {
                    name: true,
                    image: true,
                }
            }
        },
        orderBy: {
            createdAt: "asc"
        }
    });

    const pendingInvites = await prisma.organizationInvitation.findMany({
        where: {
            organizationId: organization.id,
            accepted: false,
            expiresAt: { gt: new Date() }
        },
        include: { event: true }, // Include event title for UI
        orderBy: {
            createdAt: "desc"
        }
    });

    const activeEvents = await prisma.event.findMany({
        where: {
            organizationId: organization.id,
            isArchived: false,
            status: { in: ["PLANNED", "ACTIVE"] }
        },
        select: { id: true, title: true },
        orderBy: { startTime: "asc" }
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-saffron-500" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Governance</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Board of Members</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage committee roles and permissions for your pavilion.</p>
                </div>

                {isAdmin && (
                    <InviteMemberModal
                        organizationId={organization.id}
                        events={activeEvents}
                    />
                )}
            </div>

            {/* Members List */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm">
                <div className="overflow-x-auto rounded-[2.5rem]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Member</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Joined</th>
                                {isAdmin && <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {members.map((m) => (
                                <tr key={m.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-sm overflow-hidden">
                                                {m.user?.image ? (
                                                    <img src={m.user.image} alt={m.email} className="w-full h-full object-cover" />
                                                ) : (
                                                    m.email[0].toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{m.user?.name || m.email.split('@')[0]}</div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    {m.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <RoleBadge role={m.role} />
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-xs font-bold text-slate-400">
                                            {format(new Date(m.createdAt), "MMM d, yyyy")}
                                        </div>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-8 py-6 text-right">
                                            <MemberActions
                                                memberId={m.id}
                                                currentRole={m.role}
                                                organizationId={organization.id}
                                                isSelf={member.id === m.id}
                                            />
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pending Invitations */}
            {pendingInvites.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-4 italic">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pending Invitations</h2>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm opacity-70">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <tbody className="divide-y divide-slate-50">
                                    {pendingInvites.map((invite) => (
                                        <tr key={invite.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center font-bold text-amber-500 text-sm">
                                                        {invite.email[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{invite.email}</div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">Waiting for acceptance</div>
                                                            {invite.event && (
                                                                <div className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight border border-blue-100 italic">
                                                                    For: {invite.event.title}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <RoleBadge role={invite.role} />
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-xs font-bold text-slate-400">
                                                    Invited {format(new Date(invite.createdAt), "MMM d, yyyy")}
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-8 py-6 text-right flex items-center justify-end gap-3">
                                                    <ShareOnWhatsApp
                                                        token={invite.token}
                                                        orgName={organization.name}
                                                        role={invite.role}
                                                    />
                                                    <CopyInviteLink token={invite.token} />
                                                    <RevokeInviteButton
                                                        invitationId={invite.id}
                                                        organizationId={organization.id}
                                                        email={invite.email}
                                                    />
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
