"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import {
    canRequestOtp,
    checkOtpIpRateLimit,
    createOtp,
    deleteOtpAfterDeliveryFailure,
    generateOtpCode,
    OTP_TTL_MINUTES,
} from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    phone: z.string().optional().transform(v => v === "" ? undefined : v),
});

const otpRequestSchema = z.object({
    email: z.string().email("Invalid email address"),
});

const signupOtpVerificationSchema = z.object({
    email: z.string().email("Invalid email address"),
    code: z.string().regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});

const signupResendSchema = z.object({
    email: z.string().email("Invalid email address"),
});

const SIGNUP_ENROLLMENT_COOKIE = "utsav_signup_enrollment";

function getOtpRequestKey(): string {
    if (process.env.VERCEL !== "1") return "local";

    const requestHeaders = headers();
    const address = requestHeaders.get("x-vercel-forwarded-for");
    if (!address) return "vercel:unknown";

    const secret = process.env.OTP_RATE_LIMIT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("OTP rate limiting requires NEXTAUTH_SECRET in production.");

    const fingerprint = crypto.createHmac("sha256", secret).update(address).digest("hex");
    return `ip:${fingerprint}`;
}

function hashEnrollmentToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function hasEnrollmentToken(expectedHash: string): boolean {
    const token = cookies().get(SIGNUP_ENROLLMENT_COOKIE)?.value;
    if (!token) return false;

    const actualHash = hashEnrollmentToken(token);
    return crypto.timingSafeEqual(Buffer.from(actualHash), Buffer.from(expectedHash));
}

function setEnrollmentToken(token: string) {
    cookies().set(SIGNUP_ENROLLMENT_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: OTP_TTL_MINUTES * 60,
        path: "/",
    });
}

export async function requestOtpAction(formData: any) {
    try {
        const { email } = otpRequestSchema.parse(formData);
        const normalizedEmail = email.toLowerCase();

        const isWithinIpLimit = await checkOtpIpRateLimit(getOtpRequestKey());
        if (!isWithinIpLimit) {
            return { error: "Too many verification requests. Please try again in 15 minutes." };
        }

        const check = await canRequestOtp(normalizedEmail);
        if (!check.allowed) {
            return { error: check.error };
        }

        const code = generateOtpCode();
        const createdAt = await createOtp(normalizedEmail, code);

        const result = await sendOtpEmail(normalizedEmail, code, OTP_TTL_MINUTES);
        if (result.error) {
            await deleteOtpAfterDeliveryFailure(normalizedEmail, createdAt);
            console.error("Failed to send OTP email:", result.error);
            return { error: "Failed to send the verification email. Please try again." };
        }

        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message };
        }

        console.error("OTP request error:", error);
        return { error: error instanceof Error ? error.message : "Could not send the verification code. Try again." };
    }
}

export async function requestSignupOtpAction(formData: unknown) {
    try {
        const validatedData = registerSchema.parse(formData);
        const email = validatedData.email.toLowerCase();

        const [existingUser, existingPhone, foundPendingRegistration] = await Promise.all([
            prisma.user.findUnique({ where: { email } }),
            validatedData.phone
                ? prisma.user.findUnique({ where: { phone: validatedData.phone } })
                : Promise.resolve(null),
            prisma.pendingRegistration.findUnique({ where: { email } }),
        ]);

        if (existingUser) return { error: "An account with this email already exists. Please sign in." };
        if (existingPhone) return { error: "An account with this phone number already exists." };

        let existingPendingRegistration = foundPendingRegistration;
        if (existingPendingRegistration && (
            existingPendingRegistration.consumedAt || existingPendingRegistration.expiresAt <= new Date()
        )) {
            await prisma.pendingRegistration.deleteMany({
                where: {
                    email,
                    OR: [
                        { consumedAt: { not: null } },
                        { expiresAt: { lte: new Date() } },
                    ],
                },
            });
            existingPendingRegistration = null;
        }

        if (existingPendingRegistration) {
            const delay = Math.max(
                0,
                60 - Math.floor((Date.now() - existingPendingRegistration.createdAt.getTime()) / 1000)
            );
            if (delay > 0) return { error: `Please wait ${delay}s before requesting another code.` };

            if (!hasEnrollmentToken(existingPendingRegistration.enrollmentTokenHash)) {
                return { error: "A verification request already exists. Continue in the browser where you started sign-up, or wait for it to expire." };
            }
        }

        const isWithinIpLimit = await checkOtpIpRateLimit(getOtpRequestKey());
        if (!isWithinIpLimit) {
            return { error: "Too many verification requests. Please try again in 15 minutes." };
        }

        const code = generateOtpCode();
        const createdAt = new Date();
        const [passwordHash, codeHash] = await Promise.all([
            bcrypt.hash(validatedData.password, 12),
            bcrypt.hash(code, 10),
        ]);
        const enrollmentToken = crypto.randomBytes(32).toString("base64url");

        await prisma.pendingRegistration.upsert({
            where: { email },
            create: {
                email,
                name: validatedData.name,
                phone: validatedData.phone,
                passwordHash,
                codeHash,
                enrollmentTokenHash: hashEnrollmentToken(enrollmentToken),
                expiresAt: new Date(createdAt.getTime() + OTP_TTL_MINUTES * 60_000),
            },
            update: {
                name: validatedData.name,
                phone: validatedData.phone,
                passwordHash,
                codeHash,
                enrollmentTokenHash: hashEnrollmentToken(enrollmentToken),
                attempts: 0,
                expiresAt: new Date(createdAt.getTime() + OTP_TTL_MINUTES * 60_000),
                consumedAt: null,
                createdAt,
            },
        });
        setEnrollmentToken(enrollmentToken);

        const result = await sendOtpEmail(email, code, OTP_TTL_MINUTES);
        if (result.error) {
            await prisma.pendingRegistration.deleteMany({ where: { email, createdAt } });
            console.error("Failed to send signup OTP email:", result.error);
            return { error: "Failed to send the verification email. Please try again." };
        }

        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) return { error: error.issues[0].message };
        console.error("Signup OTP request error:", error);
        return { error: "Could not send the verification code. Please try again." };
    }
}

export async function resendSignupOtpAction(formData: unknown) {
    try {
        const { email: rawEmail } = signupResendSchema.parse(formData);
        const email = rawEmail.toLowerCase();
        const pendingRegistration = await prisma.pendingRegistration.findUnique({ where: { email } });
        if (!pendingRegistration || pendingRegistration.consumedAt || pendingRegistration.expiresAt < new Date()) {
            return { error: "No active sign-up verification request. Start again." };
        }
        if (!hasEnrollmentToken(pendingRegistration.enrollmentTokenHash)) {
            return { error: "Continue sign-up in the browser where you started." };
        }

        const delay = Math.max(0, 60 - Math.floor((Date.now() - pendingRegistration.createdAt.getTime()) / 1000));
        if (delay > 0) return { error: `Please wait ${delay}s before requesting another code.` };

        const isWithinIpLimit = await checkOtpIpRateLimit(getOtpRequestKey());
        if (!isWithinIpLimit) return { error: "Too many verification requests. Please try again in 15 minutes." };

        const code = generateOtpCode();
        const createdAt = new Date();
        await prisma.pendingRegistration.update({
            where: { email },
            data: {
                codeHash: await bcrypt.hash(code, 10),
                attempts: 0,
                expiresAt: new Date(createdAt.getTime() + OTP_TTL_MINUTES * 60_000),
                createdAt,
            },
        });
        const result = await sendOtpEmail(email, code, OTP_TTL_MINUTES);
        if (result.error) {
            console.error("Failed to resend signup OTP email:", result.error);
            return { error: "Failed to send the verification email. Please try again." };
        }
        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) return { error: error.issues[0].message };
        console.error("Signup OTP resend error:", error);
        return { error: "Could not resend the verification code. Please try again." };
    }
}

export async function verifySignupOtpAction(formData: unknown) {
    try {
        const { email: rawEmail, code } = signupOtpVerificationSchema.parse(formData);
        const email = rawEmail.toLowerCase();
        const pendingRegistration = await prisma.pendingRegistration.findUnique({ where: { email } });

        if (!pendingRegistration || pendingRegistration.consumedAt) {
            return { error: "No active sign-up verification code. Request a new one." };
        }
        if (pendingRegistration.expiresAt < new Date()) {
            return { error: "Code has expired. Request a new one." };
        }
        if (pendingRegistration.attempts >= 5) {
            return { error: "Too many attempts. Request a new code." };
        }

        const isCodeValid = await bcrypt.compare(code, pendingRegistration.codeHash);
        if (!isCodeValid) {
            const attempted = await prisma.pendingRegistration.updateMany({
                where: {
                    email,
                    codeHash: pendingRegistration.codeHash,
                    consumedAt: null,
                    attempts: { lt: 5 },
                    expiresAt: { gt: new Date() },
                },
                data: { attempts: { increment: 1 } },
            });
            if (attempted.count !== 1) return { error: "Code already used or expired. Request a new one." };

            const updatedRegistration = await prisma.pendingRegistration.findUniqueOrThrow({ where: { email } });
            if (updatedRegistration.attempts >= 5) {
                await prisma.pendingRegistration.updateMany({
                    where: { email, codeHash: pendingRegistration.codeHash, consumedAt: null, attempts: { gte: 5 } },
                    data: { consumedAt: new Date() },
                });
                return { error: "Too many attempts. Request a new code." };
            }
            return { error: "Invalid verification code." };
        }

        const user = await prisma.$transaction(async (transaction) => {
            const consumed = await transaction.pendingRegistration.updateMany({
                where: {
                    email,
                    codeHash: pendingRegistration.codeHash,
                    consumedAt: null,
                    attempts: { lt: 5 },
                    expiresAt: { gt: new Date() },
                },
                data: { consumedAt: new Date() },
            });
            if (consumed.count !== 1) throw new Error("Code already used or expired. Request a new one.");

            const [existingUser, existingPhone] = await Promise.all([
                transaction.user.findUnique({ where: { email } }),
                pendingRegistration.phone
                    ? transaction.user.findUnique({ where: { phone: pendingRegistration.phone } })
                    : Promise.resolve(null),
            ]);
            if (existingUser) throw new Error("An account with this email already exists. Please sign in.");
            if (existingPhone) throw new Error("An account with this phone number already exists.");

            return transaction.user.create({
                data: {
                    email,
                    name: pendingRegistration.name,
                    phone: pendingRegistration.phone,
                    password: pendingRegistration.passwordHash,
                },
            });
        });

        return { success: true, userId: user.id };
    } catch (error) {
        if (error instanceof z.ZodError) return { error: error.issues[0].message };
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return { error: "An account with these details already exists." };
        }
        return { error: error instanceof Error ? error.message : "Could not verify your email. Please try again." };
    }
}

export async function registerUserAction(formData: any) {
    void formData;
    return { error: "Email verification is required before creating an account." };
}
