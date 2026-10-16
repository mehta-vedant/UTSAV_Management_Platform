import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { ConflictAppError } from "@/lib/errors";

export async function runIdempotent<T extends { id: string }>(input: {
    organizationId: string;
    key: string;
    operation: string;
    payload: unknown;
    execute: () => Promise<T>;
}) {
    const requestHash = createHash("sha256").update(JSON.stringify(input.payload)).digest("hex");
    try {
        await prisma.idempotencyRecord.create({ data: { organizationId: input.organizationId, key: input.key, operation: input.operation, requestHash } });
    } catch {
        const existing = await prisma.idempotencyRecord.findUnique({ where: { organizationId_key: { organizationId: input.organizationId, key: input.key } } });
        if (!existing || existing.operation !== input.operation || existing.requestHash !== requestHash) throw new ConflictAppError("This request key cannot be reused with different details.");
        if (!existing.entityId) throw new ConflictAppError("This request is already being processed. Please wait a moment.");
        return { created: false, entityId: existing.entityId };
    }
    try {
        const entity = await input.execute();
        await prisma.idempotencyRecord.update({ where: { organizationId_key: { organizationId: input.organizationId, key: input.key } }, data: { entityId: entity.id } });
        return { created: true, entityId: entity.id };
    } catch (error) {
        await prisma.idempotencyRecord.deleteMany({ where: { organizationId: input.organizationId, key: input.key, entityId: null } });
        throw error;
    }
}
