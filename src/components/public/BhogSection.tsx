"use client";

import { Soup, UtensilsCrossed, Circle, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BhogSponsorshipDialog from "./BhogSponsorshipDialog";
import { BhogOfferingWindow, OrganizationStatus } from "@prisma/client";
import { formatOfferingWindow, PrasadWindowConfig, getPrasadWindowOptions } from "@/lib/prasad-windows";

interface BhogSectionProps {
    organizationId: string;
    OrganizationName: string;
    festivalStartDate: Date;
    festivalEndDate: Date | null;
    festivalStatus: OrganizationStatus;
    prasadWindowConfig: PrasadWindowConfig;
    bhogList: {
        id: string;
        name: string;
        quantity: string;
        sponsorName: string | null;
        status: string;
        offeringDate: Date;
        offeringWindow: BhogOfferingWindow;
    }[];
}

export default function BhogSection({
    bhogList,
    organizationId,
    OrganizationName,
    festivalStartDate,
    festivalEndDate,
    festivalStatus,
    prasadWindowConfig
}: BhogSectionProps) {
    const windowSummary = getPrasadWindowOptions(prasadWindowConfig).map((option) => option.label).join(" and ");

    return (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white h-full flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Bhog Sponsorships</CardTitle>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Prasad & Food Offerings</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 flex-1">
                <div className="mb-6">
                    <div className="mb-3 rounded-2xl bg-saffron-50 border border-saffron-100 px-4 py-3">
                        <p className="text-[11px] text-saffron-800 font-bold leading-relaxed">
                            Prasad offerings are accepted for {windowSummary}. Expired windows are hidden automatically.
                        </p>
                    </div>
                    <BhogSponsorshipDialog
                        organizationId={organizationId}
                        OrganizationName={OrganizationName}
                        festivalStartDate={festivalStartDate}
                        festivalEndDate={festivalEndDate}
                        festivalStatus={festivalStatus}
                        prasadWindowConfig={prasadWindowConfig}
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[520px] overflow-y-auto pr-1">
                    {bhogList.map((b) => (
                        <div
                            key={b.id}
                            className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-lg hover:border-saffron-100 transition-all duration-300"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:bg-saffron-50 group-hover:text-saffron-600 transition-colors">
                                    <Soup className="w-4 h-4" />
                                </div>
                                <div className="flex items-center space-x-1">
                                    <span className={`w-2 h-2 rounded-full ${b.status === 'READY' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{b.status}</span>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-black text-slate-900 mb-1">{b.name}</h4>
                                <div className="flex items-center text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-widest">
                                    <UtensilsCrossed className="w-2.5 h-2.5 mr-1" />
                                    Qty: {b.quantity}
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold mb-3 uppercase tracking-wider">
                                    {new Date(b.offeringDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - {formatOfferingWindow(b.offeringWindow, prasadWindowConfig)}
                                </div>

                                {b.sponsorName ? (
                                    <div className="mt-auto">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mb-1">Sponsored By</p>
                                        <Badge className="bg-saffron-50 text-saffron-700 border-saffron-100 hover:bg-saffron-100 font-black text-[10px] px-2 py-0.5 rounded-lg w-full justify-center">
                                            {b.sponsorName}
                                        </Badge>
                                    </div>
                                ) : (
                                    <button className="w-full text-[10px] font-black uppercase py-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-300 hover:border-saffron-300 hover:text-saffron-500 hover:bg-saffron-50/30 transition-all">
                                        Available for Sponsorship
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {bhogList.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                            <p className="text-sm text-slate-400 font-bold tracking-tight uppercase">No records found</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
