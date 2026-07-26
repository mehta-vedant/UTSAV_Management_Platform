import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserOrganizations } from "@/modules/core/organization.service";
import Link from "next/link";
import { Plus, Calendar, Shield, ArrowRight, Sparkles, Building2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const memberships = await getUserOrganizations(session?.user?.id || "");

    return (
        <div className="min-h-screen overflow-x-hidden bg-slate-50/50 p-4 sm:p-6 md:p-12 lg:p-16">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-5 sm:mb-12 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-saffron-500" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Control Center</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl md:tracking-tighter">Your Organizations</h1>
                    </div>

                    <Link
                        href="/dashboard/create"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800 active:scale-95 sm:w-auto sm:px-8 sm:hover:scale-105"
                    >
                        <Plus className="w-5 h-5" />
                        Create New Organization
                    </Link>
                </div>

                {/* Organization Grid */}
                {memberships.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {memberships.map((membership: any) => (
                            <Link
                                key={membership.id}
                                href={`/${membership.organization.slug}/dashboard`}
                                className="group relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-saffron-500/30 hover:shadow-xl sm:p-8"
                            >
                                {/* Decorative Glow */}
                                <div className="absolute -top-12 -right-12 w-24 h-24 bg-saffron-500/5 rounded-full blur-3xl group-hover:bg-saffron-500/10 transition-all" />

                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="px-3 py-1 bg-saffron-50 text-saffron-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                                            <Shield className="w-3 h-3" />
                                            {membership.role.replace("_", " ")}
                                        </div>
                                        <div className={cn(
                                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm",
                                            membership.organization.type === "FESTIVAL" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                        )}>
                                            {membership.organization.type === "FESTIVAL" ? <Sparkles className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                            {membership.organization.type}
                                        </div>
                                    </div>
                                    <h3 className="mobile-safe-text text-xl font-black uppercase tracking-tight text-slate-900 transition-colors group-hover:text-saffron-600 sm:text-2xl">
                                        {membership.organization.name}
                                    </h3>
                                </div>

                                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between text-slate-400">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                                        <Calendar className="w-4 h-4" />
                                        {format(new Date(membership.organization.createdAt), "MMM d, yyyy")}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-saffron-500 group-hover:text-white transition-all">
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[3rem] border-2 border-dashed border-slate-200 bg-white px-4 py-16 text-center sm:py-24">
                        <div className="mb-6 inline-flex p-6 bg-slate-50 rounded-3xl">
                            <Plus className="w-12 h-12 text-slate-300" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">No Organizations Found</h3>
                        <p className="text-slate-500 font-medium mb-8 max-w-xs mx-auto">Start by creating your first Organization to manage donations and expenses with radical transparency.</p>
                        <Link
                            href="/dashboard/create"
                            className="inline-flex items-center gap-2 text-saffron-600 font-black uppercase tracking-widest text-sm hover:text-saffron-700 transition-colors"
                        >
                            Get Started Now <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
