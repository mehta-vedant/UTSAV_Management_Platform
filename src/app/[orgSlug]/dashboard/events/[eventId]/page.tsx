import { resolveOrgContext } from "@/lib/org-context";
import { getEventWithDetails } from "@/modules/events/event.service";
import { getEventFinancialSummary } from "@/modules/festival/event-financial.service";
import { getOrganizationMembers } from "@/modules/core/member.service";
import EventTeamManager from "@/components/dashboard/events/EventTeamManager";
import AddExpenseModal from "@/components/dashboard/expenses/AddExpenseModal";
import RecordDonationModal from "@/components/dashboard/donations/RecordDonationModal";
import CreateTaskModal from "@/components/dashboard/volunteers/CreateTaskModal";
import EventRegistrationManager from "@/components/dashboard/events/EventRegistrationManager";
import EventStatusSelector from "@/components/dashboard/events/EventStatusSelector";
import EventModal from "@/components/dashboard/events/EventModal";
import { updateEventAction } from "@/actions/event.actions";
import {
    Calendar,
    MapPin,
    Users,
    ArrowLeft,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    DollarSign,
    Settings,
    UserCircle,
    Users2,
    PlayCircle,
    Archive,
    ShoppingBag
} from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { OrganizationRole } from "@prisma/client";
import { cn } from "@/lib/utils";

interface EventDashboardProps {
    params: {
        orgSlug: string;
        eventId: string;
    };
}

export default async function EventDashboardPage({ params }: EventDashboardProps) {
    const { orgSlug, eventId } = params;

    // 1. Resolve Org & Permissions
    const { organization, member } = await resolveOrgContext(orgSlug);
    const isAdmin = member.role === OrganizationRole.ADMIN ||
        member.role === OrganizationRole.COMMITTEE_MEMBER ||
        member.role === OrganizationRole.TREASURER;

    // 2. Fetch Event Details & Financials
    const [event, financials, availableMembers] = await Promise.all([
        getEventWithDetails(organization.id, eventId),
        getEventFinancialSummary(organization.id, eventId),
        getOrganizationMembers(organization.id)
    ]);

    if (!event) throw new Error("Event not found");

    const totalSpent = financials.totalExpenses;
    const budgetLeft = financials.budgetTarget + financials.totalCollections - financials.totalExpenses;

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-4 pb-20 sm:p-6 lg:p-8 lg:pb-24 lg:space-y-10">
            {/* Navigation & Header */}
            <div className="space-y-4">
                <Link
                    href={`/${orgSlug}/dashboard/events`}
                    className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-600 transition-colors w-fit"
                >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    Back to Schedule
                </Link>

                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <EventStatusSelector
                                organizationId={organization.id}
                                orgSlug={orgSlug}
                                eventId={eventId}
                                currentStatus={event.status}
                                isAdmin={isAdmin}
                            />
                        </div>
                        <h1 className="mobile-safe-text text-3xl font-black uppercase leading-none tracking-tight text-slate-900 sm:text-5xl sm:tracking-tighter">
                            {event.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-wider text-slate-400">
                            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-4">
                                <Calendar className="w-4 h-4" />
                                <span>Timeline established</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                <span>{event.location || "Central Pavilion"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <EventModal
                            organizationId={organization.id}
                            orgSlug={orgSlug}
                            event={{
                                id: event.id,
                                title: event.title,
                                description: event.description,
                                startTime: event.startTime,
                                endTime: event.endTime,
                                location: event.location,
                                isArchived: event.isArchived,
                                budgetTarget: event.budgetTarget ? Number(event.budgetTarget) : undefined
                            }}
                            trigger={
                                <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                                    Edit Operation
                                </button>
                            }
                        />
                    </div>
                </div>
            </div>

            {/* Operational HUD */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
                {/* Budget Card */}
                <div className="rounded-[2.5rem] border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                            Budget Utilization
                        </span>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-end justify-between mb-2">
                            <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
                                {financials.utilization}%
                            </h4>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-1">
                                ₹{financials.totalExpenses.toLocaleString()} Used
                            </span>
                        </div>
                        <Progress value={financials.progress} className="h-3 bg-slate-50" />
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target</p>
                            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">₹{financials.budgetTarget.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining</p>
                            <p className="text-sm font-black text-amber-600 uppercase tracking-tight">₹{financials.remaining.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Team Readiness */}
                <div className="rounded-[2.5rem] border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            Operational Team
                        </span>
                    </div>

                    <h4 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">
                        {event.assignments.length} <span className="text-lg text-slate-400 uppercase tracking-widest font-black ml-1">Assigned</span>
                    </h4>

                    <div className="flex -space-x-3 mb-8">
                        {event.assignments.slice(0, 5).map((as, i) => (
                            <div key={as.id} className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                                {as.member.user?.name?.[0] || as.member.email[0]}
                            </div>
                        ))}
                    </div>

                    <EventTeamManager
                        organizationId={organization.id}
                        orgSlug={orgSlug}
                        eventId={eventId}
                        currentAssignments={event.assignments}
                        availableMembers={availableMembers as any}
                        isAdmin={isAdmin}
                    />
                </div>

                {/* Success Metrics */}
                <div className="rounded-[2.5rem] border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                            Task Velocity
                        </span>
                    </div>

                    <h4 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">
                        {event.tasks.filter(t => t.status === "COMPLETED").length || 0} / {event.tasks.length}
                        <span className="text-lg text-slate-400 uppercase tracking-widest font-black ml-1">Closed</span>
                    </h4>

                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-400">Registrations</span>
                            <span className="text-emerald-600">{event.registrations.length}</span>
                        </div>
                        <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[65%]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                {/* Left Column: Tasks */}
                <div className="space-y-8">
                    <div className="rounded-[2.5rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
                        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-xl">
                                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                    Milestone Watch ({event.tasks.length})
                                </h3>
                            </div>
                            <CreateTaskModal
                                organizationId={organization.id}
                                orgSlug={orgSlug}
                                volunteers={availableMembers.map((m: any) => ({
                                    id: m.id,
                                    name: m.user?.name || m.email.split('@')[0]
                                }))}
                                eventId={eventId}
                            />
                        </div>

                        <div className="space-y-3">
                            {event.tasks.map((task: any) => (
                                <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase text-white shadow-lg",
                                            task.status === "COMPLETED" ? "bg-emerald-500 shadow-emerald-200" :
                                                task.status === "IN_PROGRESS" ? "bg-blue-500 shadow-blue-200" :
                                                    "bg-slate-400 shadow-slate-200"
                                        )}>
                                            {task.assignedTo.user?.name?.[0] || task.assignedTo.email[0]}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">{task.title}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                Assigned to {task.assignedTo.user?.name || task.assignedTo.email.split('@')[0]}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest",
                                        task.status === "COMPLETED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                            task.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                "bg-slate-100 text-slate-400 border-slate-200"
                                    )}>
                                        {task.status.replace('_', ' ')}
                                    </div>
                                </div>
                            ))}
                            {event.tasks.length === 0 && (
                                <div className="text-center py-10 text-slate-300">
                                    <p className="text-[10px] font-black uppercase tracking-widest italic">No active milestones</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Financials & Participants */}
                <div className="space-y-8">
                    <div className="rounded-[2.5rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
                        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-xl">
                                    <ShoppingBag className="w-5 h-5 text-emerald-500" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Financial Deployment</h3>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-3">
                                <RecordDonationModal organizationId={organization.id} isFestival={organization.type === "FESTIVAL"} eventId={eventId} eventTitle={event.title} />
                                <AddExpenseModal organizationId={organization.id} eventId={eventId} />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Event Collected</p>
                                    <p className="text-2xl font-black text-emerald-600 tracking-tighter">Rs {Number(financials.totalCollections).toLocaleString()}</p>
                                </div>
                                <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Spent</p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tighter">₹{Number(totalSpent).toLocaleString()}</p>
                                </div>
                                <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Budget Left</p>
                                    <p className="text-2xl font-black text-emerald-600 tracking-tighter">₹{Math.max(0, budgetLeft).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {event.expenses.slice(0, 4).map((exp) => (
                                    <div key={exp.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 group hover:border-slate-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                                <ShoppingBag className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{exp.title}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{exp.category}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-slate-900">₹{Number(exp.amount).toLocaleString()}</p>
                                            <p className={cn(
                                                "text-[8px] font-black uppercase tracking-widest",
                                                exp.status === 'APPROVED' ? "text-emerald-500" : "text-amber-500"
                                            )}>{exp.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2.5rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-saffron-50 rounded-xl">
                                <Users2 className="w-5 h-5 text-saffron-500" />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Participant Roster</h3>
                        </div>
                        <EventRegistrationManager
                            organizationId={organization.id}
                            orgSlug={orgSlug}
                            eventId={eventId}
                            registrations={event.registrations}
                            isAdmin={isAdmin}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
