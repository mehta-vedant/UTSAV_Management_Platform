import { resolveOrgContext } from "@/lib/org-context";
import { getEvents } from "@/modules/events/event.service";
import EventCard from "@/components/dashboard/events/EventCard";
import EventModal from "@/components/dashboard/events/EventModal";
import { Calendar, History, ShieldCheck, Info } from "lucide-react";

interface EventsPageProps {
    params: {
        orgSlug: string;
    };
}

export default async function EventsDashboardPage({ params }: EventsPageProps) {
    const { orgSlug } = params;

    // 1. Resolve Organization & Permissions
    const { organization, isAdmin } = await resolveOrgContext(orgSlug);

    // 2. Fetch Events (Including archived for admins)
    const events = await getEvents(organization.id, isAdmin);

    const activeEvents = events.filter(e => !e.isArchived);
    const archivedEvents = events.filter(e => e.isArchived);

    return (
        <div className="p-8 max-w-7xl mx-auto pb-24 space-y-10">
            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Organization Timeline</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
                        Operations Schedule
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                        Coordinate pavilion events, rituals, and ceremonies. Real-time sync with public portal.
                    </p>
                </div>

                {isAdmin && (
                    <EventModal
                        organizationId={organization.id}
                        orgSlug={orgSlug}
                    />
                )}
            </div>

            {/* Info Message for Volunteers */}
            {!isAdmin && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-6 flex items-start gap-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                        <Info className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-blue-900 uppercase tracking-tight mb-1">Schedule Continuity</h4>
                        <p className="text-[11px] text-blue-700/80 font-medium leading-relaxed">
                            As a volunteer, you can view the official schedule to coordinate your duties.
                            Modifications are managed by the organization committee to ensure operational stability.
                        </p>
                    </div>
                </div>
            )}

            {/* Events Grid */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 px-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Active Timeline ({activeEvents.length})
                    </h3>
                </div>

                <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeEvents.map((event) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            organizationId={organization.id}
                            orgSlug={orgSlug}
                            isAdmin={isAdmin}
                        />
                    ))}

                    {activeEvents.length === 0 && (
                        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                            <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                No events scheduled for this pavilion yet.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Archived Section (Admin Only) */}
            {isAdmin && archivedEvents.length > 0 && (
                <div className="space-y-6 pt-10 border-t border-slate-200/50">
                    <div className="flex items-center gap-2 px-1">
                        <History className="w-4 h-4 text-slate-300" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                            Archived Records ({archivedEvents.length})
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 opacity-75">
                        {archivedEvents.map((event) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                organizationId={organization.id}
                                orgSlug={orgSlug}
                                isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
