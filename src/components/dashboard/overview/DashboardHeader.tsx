"use client";

import { Calendar, ExternalLink, Shield, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { OrganizationRole } from "@prisma/client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
    organization: {
        name: string;
        slug: string;
        startDate: Date;
        endDate: Date;
        openingBalance: number | null;
        publicFundraisingTarget: number | null;
        internalBudgetLimit: number | null;
        type: "FESTIVAL" | "CLUB";
    };
    role: OrganizationRole;
}

export default function DashboardHeader({ organization, role }: DashboardHeaderProps) {
    const [copied, setCopied] = useState(false);
    const [publicUrl, setPublicUrl] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            setPublicUrl(`${window.location.protocol}//${window.location.host}/${organization.slug}`);
        }
    }, [organization.slug]);

    const handleCopy = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-100">
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter uppercase whitespace-normal break-words">
                        {organization.name}
                    </h1>
                    <Badge variant="outline" className="w-fit h-6 rounded-full border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm shrink-0">
                        {organization.type === "FESTIVAL" ? "Festival Dashboard" : "Club Dashboard"}
                    </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-saffron-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                            {format(new Date(organization.startDate), "MMM d")} - {format(new Date(organization.endDate), "MMM d, yyyy")}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Role Badge */}
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl border border-slate-200/50">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                        {role.replace("_", " ")}
                    </span>
                </div>

                {/* Public Link Controls - Organization Only */}
                {organization.type === "FESTIVAL" && (
                    <div className="flex items-center bg-white rounded-2xl border border-slate-200 shadow-sm p-1 animate-in fade-in slide-in-from-right-4 duration-500">
                        <Link
                            href={`/${organization.slug}`}
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600 border-r border-slate-100"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Public Site</span>
                        </Link>
                        <button
                            onClick={handleCopy}
                            className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 active:scale-90"
                            title="Copy Public Link"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
