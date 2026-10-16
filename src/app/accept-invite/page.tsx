import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AcceptInvitePage({
    searchParams,
}: {
    searchParams: { token?: string };
}) {
    const token = searchParams.token;
    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <h1 className="text-2xl font-bold text-red-600">Invalid Invite</h1>
                <p className="mt-2 text-gray-600">No invitation token was provided.</p>
                <Link href="/" className="mt-4 text-blue-600 hover:underline">Return Home</Link>
            </div>
        );
    }

    const invite = await prisma.organizationInvitation.findUnique({
        where: { token },
        include: { organization: true, event: true }
    });

    if (!invite) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <h1 className="text-2xl font-bold text-red-600">Invalid Invite</h1>
                <p className="mt-2 text-gray-600">This invitation link is invalid or has already been used.</p>
                <Link href="/" className="mt-4 text-blue-600 hover:underline">Return Home</Link>
            </div>
        );
    }

    const session = await getServerSession(authOptions);

    if (!session) {
        const existingUser = await prisma.user.findUnique({
            where: { email: invite.email }
        });

        const targetPath = existingUser ? "/login" : "/signup";
        const callbackUrl = encodeURIComponent(`/accept-invite?token=${token}`);
        redirect(`${targetPath}?email=${encodeURIComponent(invite.email)}&callbackUrl=${callbackUrl}`);
    }

    if (invite.accepted) {
        const targetUrl = invite.eventId
            ? `/${invite.organization.slug}/dashboard/events/${invite.eventId}`
            : `/${invite.organization.slug}/dashboard`;

        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <h1 className="text-2xl font-bold text-green-600">Invite Already Accepted</h1>
                <p className="mt-2 text-gray-600">You are already a member of {invite.organization.name}.</p>
                <Link href={targetUrl} className="mt-4 text-blue-600 hover:underline">Go to Dashboard</Link>
            </div>
        );
    }

    if (invite.expiresAt < new Date()) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <h1 className="text-2xl font-bold text-red-600">Invite Expired</h1>
                <p className="mt-2 text-gray-600">This invitation has expired. Please ask the admin for a new one.</p>
                <Link href="/" className="mt-4 text-blue-600 hover:underline">Return Home</Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Accept Invitation</h1>

                {session && session.user?.email?.toLowerCase() !== invite.email.toLowerCase() && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className="mt-1">
                                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">Account Mismatch</h4>
                                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                    This invite is specifically for <strong className="font-bold">{invite.email}</strong>.<br />
                                    You are currently logged in as <strong className="font-bold">{session.user?.email}</strong>.
                                </p>
                                <p className="text-[10px] text-amber-600 mt-2 font-bold italic">
                                    Please logout and login with the correct account to join.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <p className="text-gray-600 mb-6">
                    You have been invited to join <strong>{invite.organization.name}</strong>
                    {invite.event && (
                        <> specifically for the <strong>{invite.event.title}</strong> event</>
                    )}
                    as a <strong>{invite.role}</strong>.
                </p>

                {session && session.user?.email?.toLowerCase() === invite.email.toLowerCase() ? (
                    <form action={async () => {
                        "use server";
                        await acceptInviteAction(token);
                    }}>
                        <AcceptInviteButton />
                    </form>
                ) : (
                    <Button disabled className="w-full bg-slate-100 text-slate-400 font-bold py-3 cursor-not-allowed">
                        Switch Account to Join
                    </Button>
                )}
            </div>
        </div>
    );
}

// Client component for the button to show loading state
function AcceptInviteButton() {
    return (
        <Button
            type="submit"
            className="w-full bg-[#ff7a18] hover:bg-[#e66a12] text-white font-bold py-3"
        >
            Accept and Join
        </Button>
    );
}

async function acceptInviteAction(token: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Login required");

    const invite = await prisma.organizationInvitation.findUnique({
        where: { token },
        include: { organization: true, event: true }
    });

    if (!invite || invite.accepted || invite.expiresAt < new Date()) {
        throw new Error("Invalid or expired invitation");
    }

    // 0. Defensive: Get fresh user ID from DB because JWT session might be stale (e.g., after DB wipe)
    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email! }
    });

    if (!dbUser) {
        throw new Error("User record not found in database. Please log out and sign up again.");
    }

    const currentUserId = dbUser.id;

    // 4. Check if user is already a member (Look up by both ID and Email for robustness)
    const existingMember = await prisma.organizationMember.findFirst({
        where: {
            organizationId: invite.organizationId,
            OR: [
                { userId: currentUserId },
                { email: session.user.email! }
            ]
        },
    });

    // 5. CRITICAL: If they are already an active member, DON'T let them overwrite their role via an invite
    if (existingMember && !existingMember.isArchived) {
        // Just redirect them to their dashboard
        const targetUrl = invite.eventId
            ? `/${invite.organization.slug}/dashboard/events/${invite.eventId}`
            : `/${invite.organization.slug}/dashboard`;

        redirect(targetUrl);
    }

    // 6. PROTECTIVE: Ensure the person accepting matches the invite email
    // This handles cases where an admin clicks their own link
    if (session.user.email!.toLowerCase() !== invite.email.toLowerCase()) {
        throw new Error(`Account mismatch. This invite is for ${invite.email}, but you are logged in as ${session.user.email}.`);
    }

    // 7. Create membership or restore archived one
    let targetMemberId: string;
    if (!existingMember) {
        const newMember = await prisma.organizationMember.create({
            data: {
                organizationId: invite.organizationId,
                userId: currentUserId,
                email: session.user.email!,
                role: invite.role,
            },
        });
        targetMemberId = newMember.id;
    } else {
        // Restore archived member
        const updatedMember = await prisma.organizationMember.update({
            where: { id: existingMember.id },
            data: {
                isArchived: false,
                role: invite.role
            },
        });
        targetMemberId = updatedMember.id;
    }

    // 3. If there was an event context, auto-assign the member to the event (if not already)
    if (invite.eventId) {
        await prisma.eventAssignment.upsert({
            where: {
                eventId_organizationMemberId: {
                    eventId: invite.eventId,
                    organizationMemberId: targetMemberId
                }
            },
            update: {},
            create: {
                eventId: invite.eventId,
                organizationMemberId: targetMemberId,
                organizationId: invite.organizationId,
            }
        });
    }

    // 4. Mark invitation as accepted
    await prisma.organizationInvitation.update({
        where: { token },
        data: { accepted: true },
    });

    // 5. Determine redirect target
    const targetUrl = invite.eventId
        ? `/${invite.organization.slug}/dashboard/events/${invite.eventId}`
        : `/${invite.organization.slug}/dashboard`;

    redirect(targetUrl);
}
