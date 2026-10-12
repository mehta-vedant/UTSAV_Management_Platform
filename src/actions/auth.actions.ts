"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { headers } from "next/headers";
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

export async function registerUserAction(formData: any) {
    try {
        const validatedData = registerSchema.parse(formData);
        const normalizedEmail = validatedData.email.toLowerCase();

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            return { error: "User with this email already exists" };
        }

        // Check if phone exists (if provided)
        if (validatedData.phone) {
            const existingPhone = await prisma.user.findUnique({
                where: { phone: validatedData.phone },
            });
            if (existingPhone) {
                return { error: "User with this phone number already exists" };
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validatedData.password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                password: hashedPassword,
                name: validatedData.name,
                phone: validatedData.phone,
            },
        });

        return { success: true, userId: user.id };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message };
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                const target = (error.meta?.target as string[]) || [];
                if (target.includes('email')) return { error: "Email already in use" };
                if (target.includes('phone')) return { error: "Phone number already in use" };
                return { error: "An account with these details already exists" };
            }
        }

        console.error("Registration error details:", error);
        return { error: error instanceof Error ? error.message : "An unexpected error occurred during registration" };
    }
}
