import { prisma } from "@/lib/prisma";

/** Persistent, per-member budget for costly AI calls. */
export async function consumeAiRequest(memberId: string, scope: "assistant" | "receipt") {
    const key = `ai:${scope}:${memberId}`;
    const maxRequests = scope === "assistant" ? 20 : 10;
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000);
    const existing = await prisma.aiRequestLimit.findUnique({ where: { key } });
    if (!existing) {
        try {
            await prisma.aiRequestLimit.create({ data: { key, windowStartedAt: now } });
            return;
        } catch {
            // A concurrent request created the row; continue to guarded updates.
        }
    }
    const reset = await prisma.aiRequestLimit.updateMany({
        where: { key, windowStartedAt: { lte: windowStart } },
        data: { windowStartedAt: now, requests: 1 },
    });
    if (reset.count) return;
    const incremented = await prisma.aiRequestLimit.updateMany({
        where: { key, windowStartedAt: { gt: windowStart }, requests: { lt: maxRequests } },
        data: { requests: { increment: 1 } },
    });
    if (!incremented.count) throw new Error("AI request limit reached. Please try again in about an hour.");
}
