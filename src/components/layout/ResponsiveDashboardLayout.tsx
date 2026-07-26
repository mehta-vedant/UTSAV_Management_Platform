"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Menu,
    X,
    Sparkles,
    Heart,
    Activity,
    Utensils,
    ClipboardList,
    Calendar,
    Users,
    Plus,
    Shield,
    ChevronRight,
    LayoutDashboard,
    PanelLeftClose,
    PanelLeftOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdminAssistantPanel from "@/components/dashboard/assistant/AdminAssistantPanel";

interface ResponsiveDashboardLayoutProps {
    children: React.ReactNode;
    organization: {
        id: string;
        name: string;
        slug: string;
        type: "FESTIVAL" | "CLUB";
    };
    orgSlug: string;
}

export default function ResponsiveDashboardLayout({
    children,
    organization,
    orgSlug
}: ResponsiveDashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarSize, setSidebarSize] = useState<"collapsed" | "normal">("normal");
    const [isMobile, setIsMobile] = useState(false);
    const pathname = usePathname();
    const isCollapsed = !isMobile && sidebarSize === "collapsed";

    // Check for mobile screen size
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        if (isMobile) setIsSidebarOpen(false);
    }, [pathname, isMobile]);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (isSidebarOpen && isMobile) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
    }, [isSidebarOpen, isMobile]);

    const navItems = [
        { name: "Overview", href: `/${orgSlug}/dashboard`, icon: Sparkles },
        {
            name: organization.type === "FESTIVAL" ? "Donations" : "Funds",
            href: `/${orgSlug}/dashboard/donations`,
            icon: Heart
        },
        { name: "Expenses", href: `/${orgSlug}/dashboard/expenses`, icon: Activity },
        ...(organization.type === "FESTIVAL" ? [
            { name: "Bhog", href: `/${orgSlug}/dashboard/bhog`, icon: Utensils }
        ] : []),
        { name: "Volunteers", href: `/${orgSlug}/dashboard/volunteers`, icon: ClipboardList },
        { name: "Events", href: `/${orgSlug}/dashboard/events`, icon: Calendar },
        { name: "Members", href: `/${orgSlug}/dashboard/members`, icon: Users },
    ];

    const toggleSidebarSize = () => {
        setSidebarSize((current) => current === "collapsed" ? "normal" : "collapsed");
    };

    return (
        <div className="min-h-screen overflow-x-hidden bg-slate-50 flex flex-col md:flex-row">
            {/* Mobile Header (Only visible on mobile) */}
            <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800 shadow-lg">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col text-left">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-saffron-500 leading-none mb-1">
                            {organization.type === "FESTIVAL" ? "Festival" : "Club"}
                        </span>
                        <span className="text-sm font-black tracking-tight uppercase truncate max-w-[150px]">
                            {organization.name}
                        </span>
                    </div>
                </div>
                <Link
                    href="/dashboard"
                    className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                    <Plus className="w-5 h-5" />
                </Link>
            </header>

            {/* Backdrop for Mobile Sidebar */}
            <AnimatePresence>
                {isSidebarOpen && isMobile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Desktop & Mobile Sidebar */}
            <motion.aside
                initial={false}
                animate={{
                    x: isMobile ? (isSidebarOpen ? 0 : -320) : 0,
                    width: isMobile ? 280 : isCollapsed ? 84 : 280,
                }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={cn(
                    "fixed top-0 left-0 bottom-0 bg-slate-900 text-white z-[70] flex flex-col border-r border-slate-800/50 shadow-2xl md:shadow-none md:sticky md:top-0 md:translate-x-0 md:z-30",
                    !isSidebarOpen && "hidden md:flex"
                )}
            >
                {/* Close Button (Mobile Only) */}
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-xl md:hidden text-slate-400 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <button
                    onClick={toggleSidebarSize}
                    className="absolute top-4 right-4 hidden md:flex w-9 h-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>

                <div className={cn("pb-4", isCollapsed ? "px-4 pt-6" : "p-8")}>
                    <div className={cn("flex items-center mb-6", isCollapsed ? "justify-center mt-8" : "gap-2 pr-10")}>
                        <div className="w-8 h-8 shrink-0 bg-saffron-500 rounded-xl flex items-center justify-center shadow-lg shadow-saffron-500/20">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                    </div>

                    {!isCollapsed && <div className="space-y-2">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-saffron-500 opacity-60">
                            {organization.type === "FESTIVAL" ? "Festival Center" : "Club HQ"}
                        </h2>
                        <div className="text-xl font-black uppercase leading-tight whitespace-normal break-words tracking-normal">
                            {organization.name}
                        </div>
                    </div>}
                </div>

                {/* Navigation Items */}
                <nav className={cn("flex-1 py-8 space-y-1.5 overflow-y-auto custom-scrollbar", isCollapsed ? "px-3" : "px-4")}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                title={isCollapsed ? item.name : undefined}
                                className={cn(
                                    "flex items-center rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all group relative overflow-hidden",
                                    isCollapsed ? "justify-center px-0 py-3.5 aspect-square" : "justify-between px-4 py-3.5",
                                    isActive
                                        ? "bg-saffron-500 text-white shadow-lg shadow-saffron-500/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <div className={cn("flex items-center relative z-10 min-w-0", isCollapsed ? "justify-center" : "gap-3")}>
                                    <item.icon className={cn(
                                        "w-4 h-4 shrink-0 transition-colors",
                                        isActive ? "text-white" : "text-slate-500 group-hover:text-saffron-400"
                                    )} />
                                    {!isCollapsed && <span className="whitespace-normal break-words">{item.name}</span>}
                                </div>
                                {!isCollapsed && (isActive ? (
                                    <div className="w-1.5 h-1.5 bg-white rounded-full relative z-10" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-500" />
                                ))}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Controls */}
                <div className={cn("border-t border-slate-800/50 bg-slate-950/30", isCollapsed ? "p-3" : "p-6")}>
                    <Link
                        href="/dashboard"
                        title={isCollapsed ? `Switch ${organization.type === "FESTIVAL" ? "Festival" : "Club"}` : undefined}
                        className={cn(
                            "flex items-center rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:bg-slate-800 transition-all group",
                            isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
                        )}
                    >
                        <div className="w-8 h-8 shrink-0 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                            <LayoutDashboard className="w-4 h-4" />
                        </div>
                        {!isCollapsed && <span className="whitespace-normal break-words">Switch {organization.type === "FESTIVAL" ? "Festival" : "Club"}</span>}
                    </Link>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 w-full min-w-0 overflow-x-hidden">
                <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-10">
                    {children}
                </div>
            </main>
            <AdminAssistantPanel organizationId={organization.id} organizationName={organization.name} />
        </div>
    );
}
