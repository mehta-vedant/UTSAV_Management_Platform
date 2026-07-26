import { getTenantPrisma } from "@/lib/access-control";
import { AuditVisibility, Prisma } from "@prisma/client";

export async function record(input: {
    organizationId: string;
    actorMemberId?: string | null;
    entityType: string;
    entityId?: string | null;
    action: string;
    before?: Prisma.InputJsonValue | null;
    after?: Prisma.InputJsonValue | null;
    metadata?: Prisma.InputJsonValue | null;
    visibility?: AuditVisibility;
}) {
    const tenantPrisma = getTenantPrisma(input.organizationId);

    return tenantPrisma.auditLog.create({
        data: {
            organizationId: input.organizationId,
            actorMemberId: input.actorMemberId || null,
            entityType: input.entityType,
            entityId: input.entityId || null,
            action: input.action,
            before: input.before || undefined,
            after: input.after || undefined,
            metadata: input.metadata || undefined,
            visibility: input.visibility || AuditVisibility.INTERNAL,
            occurredAt: new Date(),
        },
    });
}
