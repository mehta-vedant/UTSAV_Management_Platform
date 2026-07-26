import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { validateAccess } from "@/lib/access-control";
import { getOrganizationBySlug } from "@/modules/core/organization.service";
import Link from "next/link";
import {
    Sparkles,
    Shield,
    Users,
    Plus,
    Calendar,
    Heart,
    Activity,
    Utensils,
    ClipboardList
} from "lucide-react";

import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";

export default async function OrganizationDashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { orgSlug: string };
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    // Resolve slug to organization
    const organization = await getOrganizationBySlug(params.orgSlug);

    if (!organization) redirect("/dashboard");

    // Check membership
    try {
        await validateAccess(organization.id);
    } catch (error) {
        redirect("/dashboard");
    }

    return (
        <ResponsiveDashboardLayout
            organization={organization as any}
            orgSlug={params.orgSlug}
        >
            {children}
        </ResponsiveDashboardLayout>
    );
}
