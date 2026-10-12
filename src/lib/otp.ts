import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_INTERVAL_SECONDS = 60;
export const OTP_IP_RATE_LIMIT_MAX_REQUESTS = 5;
export const OTP_IP_RATE_LIMIT_WINDOW_MINUTES = 15;

export function generateOtpCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
}

export function getResendDelaySeconds(createdAt: Date): number {
    const elapsedSeconds = Math.floor((Date.now() - createdAt.getTime()) / 1000);
    return Math.max(0, OTP_RESEND_INTERVAL_SECONDS - elapsedSeconds);
}

export async function createOtp(email: string, code: string): Promise<Date> {
    const now = new Date();
    const codeHash = await bcrypt.hash(code, 10);
    await prisma.emailOtp.upsert({
        where: { email },
        create: {
            email,
            codeHash,
            expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60_000),
        },
        update: {
            codeHash,
            expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60_000),
            attempts: 0,
            consumedAt: null,
            createdAt: now,
        },
    });
    return now;
}

export async function deleteOtpAfterDeliveryFailure(email: string, createdAt: Date): Promise<void> {
    await prisma.emailOtp.deleteMany({
        where: { email, createdAt },
    });
}

export async function checkOtpIpRateLimit(key: string): Promise<boolean> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - OTP_IP_RATE_LIMIT_WINDOW_MINUTES * 60_000);
    const existing = await prisma.otpRequestLimit.findUnique({ where: { key } });

    if (!existing) {
        try {
            await prisma.otpRequestLimit.create({
                data: { key, windowStartedAt: now },
            });
            return true;
        } catch {
            // Another request created the row first. Re-evaluate using the guarded update below.
        }
    }

    const reset = await prisma.otpRequestLimit.updateMany({
        where: { key, windowStartedAt: { lte: windowStart } },
        data: { windowStartedAt: now, requests: 1 },
    });
    if (reset.count === 1) return true;

    const incremented = await prisma.otpRequestLimit.updateMany({
        where: {
            key,
            windowStartedAt: { gt: windowStart },
            requests: { lt: OTP_IP_RATE_LIMIT_MAX_REQUESTS },
        },
        data: { requests: { increment: 1 } },
    });
    return incremented.count === 1;
}

export async function canRequestOtp(email: string): Promise<
    { allowed: true } | { allowed: false; error: string }
> {
    const existing = await prisma.emailOtp.findUnique({ where: { email } });
    if (!existing) return { allowed: true };

    const delay = getResendDelaySeconds(existing.createdAt);
    if (delay > 0) {
        return { allowed: false, error: `Please wait ${delay}s before requesting another code.` };
    }

    const isActive =
        !existing.consumedAt && existing.expiresAt > new Date() && existing.attempts < OTP_MAX_ATTEMPTS;
    if (isActive) {
        return { allowed: false, error: "A code was already sent to this email. Check your inbox." };
    }

    return { allowed: true };
}

export async function verifyOtp(
    email: string,
    code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const otp = await prisma.emailOtp.findUnique({ where: { email } });

    if (!otp || otp.consumedAt) {
        return { ok: false, error: "No active verification code. Request a new one." };
    }
    if (otp.expiresAt < new Date()) {
        return { ok: false, error: "Code has expired. Request a new one." };
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
        return { ok: false, error: "Too many attempts. Request a new code." };
    }

    const valid = await bcrypt.compare(code, otp.codeHash);
    if (!valid) {
        const next = await prisma.emailOtp.update({
            where: { email },
            data: { attempts: { increment: 1 } },
        });
        if (next.attempts >= OTP_MAX_ATTEMPTS) {
            await prisma.emailOtp.update({
                where: { email },
                data: { consumedAt: new Date() },
            });
            return { ok: false, error: "Too many attempts. Request a new code." };
        }
        return { ok: false, error: "Invalid verification code." };
    }

    // Atomically consume the code so it can never be used twice (race-safe).
    const consumed = await prisma.emailOtp.updateMany({
        where: { email, consumedAt: null },
        data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
        return { ok: false, error: "Code already used. Request a new one." };
    }

    return { ok: true };
}
