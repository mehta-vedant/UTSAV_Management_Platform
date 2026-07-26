import { resolveOrgContext } from "@/lib/org-context";
import { getAllTasks, getMyTasks, getVolunteerWorkload } from "@/modules/tasks/task.service";
import VolunteerListView from "@/components/dashboard/volunteers/VolunteerListView";
import TaskBoard from "@/components/dashboard/volunteers/TaskBoard";
import CreateTaskModal from "@/components/dashboard/volunteers/CreateTaskModal";
import { ClipboardList, Users, ShieldCheck } from "lucide-react";
import { OrganizationRole } from "@prisma/client";

interface VolunteersPageProps {
    params: {
        orgSlug: string;
    };
}

export default async function VolunteersPage({ params }: VolunteersPageProps) {
    const { orgSlug } = params;

    // 1. Resolve Organization & Permissions
    const { organization, member, isAdmin } = await resolveOrgContext(orgSlug);

    // 2. Data Fetching (Parallel)
    const [tasks, volunteers] = await Promise.all([
        isAdmin || member.role === OrganizationRole.TREASURER
            ? getAllTasks(organization.id)
            : getMyTasks(organization.id),
        isAdmin || member.role === OrganizationRole.TREASURER
            ? getVolunteerWorkload(organization.id)
            : Promise.resolve([]),
    ]);

    return (
        <div className="p-8 max-w-7xl mx-auto pb-24 space-y-10">
            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-saffron-50 text-saffron-600 rounded-lg border border-saffron-100">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-saffron-700">Governance & Operations</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
                        {isAdmin ? "Workforce Command" : "My Assignments"}
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                        {isAdmin
                            ? "Assign duties, monitor status, and manage the team's workforce."
                            : "Track your assigned responsibilities and report progress to the committee."}
                    </p>
                </div>

                {isAdmin && (
                    <CreateTaskModal
                        organizationId={organization.id}
                        orgSlug={orgSlug}
                        volunteers={volunteers}
                    />
                )}
            </div>

            {/* Section A: Volunteer Workload (Admin/Treasurer/Committee) */}
            {(isAdmin || member.role === OrganizationRole.TREASURER) && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <VolunteerListView
                        volunteers={volunteers}
                        currentRole={member.role}
                    />
                </div>
            )}

            {/* Section B: Task Board */}
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-2 px-1">
                    <ClipboardList className="w-4 h-4 text-slate-400" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Task Board
                    </h3>
                </div>

                <TaskBoard
                    tasks={tasks as any}
                    organizationId={organization.id}
                    orgSlug={orgSlug}
                    currentUserRole={member.role}
                    currentMemberId={member.id}
                />
            </div>
        </div>
    );
}
