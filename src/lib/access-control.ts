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
    | "members:invite"
    | "members:updateRole"
    | "events:manage"
    | "tasks:manage"
    | "tasks:updateOwn"
    | "public:read"
    | "public:manage";

const rolePermissions: Record<OrganizationRole, Permission[]> = {
    [OrganizationRole.ADMIN]: [
        "finance:read",
        "finance:create",
        "finance:approve",
        "finance:update",
        "members:invite",
        "members:updateRole",
        "events:manage",
        "tasks:manage",
        "tasks:updateOwn",
        "public:read",
        "public:manage",
    ],
    [OrganizationRole.TREASURER]: [
        "finance:read",
        "finance:create",
        "finance:approve",
        "finance:update",
        "tasks:updateOwn",
        "public:read",
    ],
    [OrganizationRole.COMMITTEE_MEMBER]: [
        "finance:read",
        "finance:create",
        "events:manage",
        "tasks:manage",
        "tasks:updateOwn",
        "public:read",
    ],
    [OrganizationRole.VOLUNTEER]: [
        "tasks:updateOwn",
        "public:read",
    ],
};

const permissionMessages: Partial<Record<Permission, string>> = {
    "finance:approve": "You do not have permission to approve expenses.",
    "finance:update": "You do not have permission to edit financial records.",
    "members:invite": "You do not have permission to invite members.",
    "members:updateRole": "You do not have permission to change member roles.",
    "events:manage": "You do not have permission to manage events.",
    "tasks:manage": "You do not have permission to manage tasks.",
};

/**
 * Enterprise-Grade Access Validation
 * Performs multi-layer checks: Auth -> Membership -> Role
 */
export async function validateAccess(
    organizationId: string,
    requiredRoles: OrganizationRole[] = [],
    prefetchedSession?: any // Optimization for nested calls
) {
    // --- DEVELOPMENT BYPASS ---
    // --- DEVELOPMENT BYPASS (DISABLED) ---
    /*
    if (process.env.DISABLE_AUTH === "true") {
        return {
            user: { id: "dev-user-id", email: "dev@example.com", name: "Dev Admin" },
            member: { id: "dev-member-id", role: OrganizationRole.ADMIN },
            organizationId,
        };
    }
    */

    const session = prefetchedSession || await getServerSession(authOptions);

    if (!session || !session.user) {
        throw new AuthenticationError();
    }

    // --- Security Level 2: DB-Verified Role Check ---
    const member = await prisma.organizationMember.findFirst({
        where: {
            organizationId: organizationId,
            OR: [
                { userId: session.user.id },
                { email: session.user.email }
            ],
            isArchived: false,
        },
        select: {
            id: true,
            role: true,
        },
    });

    if (!member) {
        throw new AuthorizationError("You are not a member of this organization.");
    }

    // Role validation
    if (requiredRoles.length > 0 && !requiredRoles.includes(member.role)) {
        throw new AuthorizationError(
            "You do not have permission to perform this action."
        );
    }

    return {
        user: session.user,
        member: member,
        organizationId,
    };
}

export async function requirePermission(
    organizationId: string,
    permission: Permission,
    prefetchedSession?: any
) {
    const access = await validateAccess(organizationId, [], prefetchedSession);
    const allowed = rolePermissions[access.member.role]?.includes(permission);

    if (!allowed) {
        throw new AuthorizationError(permissionMessages[permission]);
    }

    return access;
}

export function hasPermission(role: OrganizationRole, permission: Permission) {
    return rolePermissions[role]?.includes(permission) || false;
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
                    ];

                    if (tenantModels.includes(model)) {
                        const anyArgs = args as any;

                        // 1. Enforce read/update/delete isolation via 'where'
                        if (anyArgs.where) {
                            anyArgs.where = { ...anyArgs.where, organizationId };
                        } else if (operation !== 'create') {
                            // Non-create operations usually need a where clause; 
                            // if missing, we force it for safety.
                            anyArgs.where = { organizationId };
                        }

                        // 2. Enforce create isolation (Inject organizationId)
                        if (operation === 'create' && anyArgs.data) {
                            anyArgs.data = { ...anyArgs.data, organizationId };
                        }

                        // 3. Enforce multi-create isolation
                        if (operation === 'createMany' && anyArgs.data) {
                            if (Array.isArray(anyArgs.data)) {
                                anyArgs.data = anyArgs.data.map((item: any) => ({
                                    ...item,
                                    organizationId
                                }));
                            } else {
                                anyArgs.data = { ...anyArgs.data, organizationId };
                            }
                        }

                        // 4. Prevent modifying organizationId on updates
                        if ((operation === 'update' || operation === 'updateMany') && anyArgs.data) {
                            if (anyArgs.data.organizationId) {
                                delete anyArgs.data.organizationId; // Strip it to prevent cross-tenant migration
                            }
                        }

                        // 5. Handle Upsert (Separate create and update logic)
                        if (operation === 'upsert') {
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

