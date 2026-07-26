import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { OrganizationRole } from "@prisma/client";
import { AuthenticationError, AuthorizationError, InvariantError } from "./errors";

export type Permission =
    | "finance:read"
    | "finance:create"
    | "finance:approve"
    | "finance:update"
    | "members:read"
    | "members:invite"
    | "members:manage"
    | "events:read"
    | "events:manage"
    | "tasks:manage"
    | "tasks:updateOwn"
    | "bhog:read"
    | "bhog:manage"
    | "org:manage"
    | "audit:read"
    | "public:read"
    | "public:manage";

const rolePermissions: Record<OrganizationRole, Permission[]> = {
    [OrganizationRole.ADMIN]: [
        "finance:read",
        "finance:create",
        "finance:approve",
        "finance:update",
        "members:read",
        "members:invite",
        "members:manage",
        "events:read",
        "events:manage",
        "tasks:manage",
        "tasks:updateOwn",
        "bhog:read",
        "bhog:manage",
        "org:manage",
        "audit:read",
        "public:read",
        "public:manage",
    ],
    [OrganizationRole.TREASURER]: [
        "finance:read",
        "finance:create",
        "finance:approve",
        "finance:update",
        "members:read",
        "tasks:updateOwn",
        "bhog:read",
        "audit:read",
        "public:read",
    ],
    [OrganizationRole.COMMITTEE_MEMBER]: [
        "finance:read",
        "finance:create",
        "members:read",
        "events:read",
        "events:manage",
        "tasks:manage",
        "tasks:updateOwn",
        "bhog:read",
        "public:read",
    ],
    [OrganizationRole.VOLUNTEER]: [
        "tasks:updateOwn",
        "events:read",
        "public:read",
    ],
};

const permissionMessages: Partial<Record<Permission, string>> = {
    "finance:approve": "You do not have permission to approve expenses.",
    "finance:update": "You do not have permission to edit financial records.",
    "members:invite": "You do not have permission to invite members.",
    "members:manage": "You do not have permission to manage members.",
    "events:manage": "You do not have permission to manage events.",
    "tasks:manage": "You do not have permission to manage tasks.",
    "bhog:manage": "You do not have permission to manage bhog items.",
    "org:manage": "You do not have permission to manage this organization.",
};

/**
 * Check if a role has a specific permission (synchronous, no DB call).
 */
export function hasPermission(role: OrganizationRole, permission: Permission): boolean {
    return rolePermissions[role]?.includes(permission) || false;
}

/**
 * Internal: Validates session + membership.
 */
async function resolveAccess(
    organizationId: string,
    prefetchedSession?: any
) {
    const session = prefetchedSession || await getServerSession(authOptions);

    if (!session || !session.user) {
        throw new AuthenticationError();
    }

    const member = await prisma.organizationMember.findFirst({
        where: {
            organizationId,
            OR: [
                { userId: session.user.id },
                { email: session.user.email },
            ],
            isArchived: false,
        },
        select: {
            id: true,
            role: true,
            userId: true,
        },
    });

    if (!member) {
        throw new AuthorizationError("You are not a member of this organization.");
    }

    return {
        user: session.user,
        member,
        organizationId,
    };
}

/**
 * Single authorization function for all service and action layers.
 * Checks session, membership, and fine-grained permission.
 */
export async function requirePermission(
    organizationId: string,
    permission: Permission,
    prefetchedSession?: any
) {
    const access = await resolveAccess(organizationId, prefetchedSession);
    const allowed = hasPermission(access.member.role, permission);

    if (!allowed) {
        throw new AuthorizationError(permissionMessages[permission]);
    }

    return access;
}

/**
 * @deprecated Use requirePermission() instead. Temporary re-export for migration.
 * Will be removed in Phase 2.
 */
export async function validateAccess(
    organizationId: string,
    requiredRoles: OrganizationRole[] = [],
    prefetchedSession?: any
) {
    const access = await resolveAccess(organizationId, prefetchedSession);

    if (requiredRoles.length > 0 && !requiredRoles.includes(access.member.role)) {
        throw new AuthorizationError(
            "You do not have permission to perform this action."
        );
    }

    return access;
}

/**
 * Tenant-Scoped Prisma Client
 * Automatically filters all queries and validates writes by organizationId
 */
export const getTenantPrisma = (organizationId: string) => {
    if (!organizationId) {
        throw new InvariantError("Organization context is missing for this operation.");
    }

    return prisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const tenantModels = [
                        "Donation",
                        "Expense",
                        "OrganizationMember",
                        "BhogItem",
                        "Volunteer",
                        "Event",
                        "VolunteerTask",
                        "AuditLog",
                        "EventAssignment",
                        "EventRegistration",
                    ];

                    if (tenantModels.includes(model)) {
                        const anyArgs = args as any;

                        if (anyArgs.where) {
                            anyArgs.where = { ...anyArgs.where, organizationId };
                        } else if (operation !== "create") {
                            anyArgs.where = { organizationId };
                        }

                        if (operation === "create" && anyArgs.data) {
                            anyArgs.data = { ...anyArgs.data, organizationId };
                        }

                        if (operation === "createMany" && anyArgs.data) {
                            if (Array.isArray(anyArgs.data)) {
                                anyArgs.data = anyArgs.data.map((item: any) => ({
                                    ...item,
                                    organizationId,
                                }));
                            } else {
                                anyArgs.data = { ...anyArgs.data, organizationId };
                            }
                        }

                        if ((operation === "update" || operation === "updateMany") && anyArgs.data) {
                            if (anyArgs.data.organizationId) {
                                delete anyArgs.data.organizationId;
                            }
                        }

                        if (operation === "upsert") {
                            if (anyArgs.create) {
                                anyArgs.create = { ...anyArgs.create, organizationId };
                            }
                            if (anyArgs.update && anyArgs.update.organizationId) {
                                delete anyArgs.update.organizationId;
                            }
                        }
                    }

                    return query(args);
                },
            },
        },
    });
};
