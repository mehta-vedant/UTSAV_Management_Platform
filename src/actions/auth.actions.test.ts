import bcrypt from "bcryptjs";
import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    userFindUnique: vi.fn(),
    userCreate: vi.fn(),
    pendingFindUnique: vi.fn(),
    pendingFindUniqueOrThrow: vi.fn(),
    pendingUpsert: vi.fn(),
    pendingDeleteMany: vi.fn(),
    pendingUpdate: vi.fn(),
    pendingUpdateMany: vi.fn(),
    transaction: vi.fn(),
    sendOtpEmail: vi.fn(),
    checkOtpIpRateLimit: vi.fn(),
    cookieGet: vi.fn(),
    cookieSet: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: mocks.userFindUnique, create: mocks.userCreate },
        pendingRegistration: {
            findUnique: mocks.pendingFindUnique,
            findUniqueOrThrow: mocks.pendingFindUniqueOrThrow,
            upsert: mocks.pendingUpsert,
            deleteMany: mocks.pendingDeleteMany,
            update: mocks.pendingUpdate,
            updateMany: mocks.pendingUpdateMany,
        },
        $transaction: mocks.transaction,
    },
}));

vi.mock("next/headers", () => ({
    headers: () => new Headers(),
    cookies: () => ({ get: mocks.cookieGet, set: mocks.cookieSet }),
}));
vi.mock("@/lib/email", () => ({ sendOtpEmail: mocks.sendOtpEmail }));
vi.mock("@/lib/otp", async () => {
    const actual = await vi.importActual<typeof import("@/lib/otp")>("@/lib/otp");
    return { ...actual, checkOtpIpRateLimit: mocks.checkOtpIpRateLimit };
});

import { requestSignupOtpAction, verifySignupOtpAction } from "./auth.actions";

describe("sign-up email verification", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.userFindUnique.mockResolvedValue(null);
        mocks.pendingFindUnique.mockResolvedValue(null);
        mocks.checkOtpIpRateLimit.mockResolvedValue(true);
        mocks.pendingUpsert.mockResolvedValue({});
        mocks.sendOtpEmail.mockResolvedValue({ data: {} });
        mocks.cookieGet.mockReturnValue(undefined);
    });

    it("does not create a user when it only sends the sign-up OTP", async () => {
        const result = await requestSignupOtpAction({
            name: "Asha Patel",
            email: "asha@example.com",
            password: "safe-password",
            phone: "",
        });

        expect(result).toEqual({ success: true });
        expect(mocks.pendingUpsert).toHaveBeenCalledOnce();
        expect(mocks.userCreate).not.toHaveBeenCalled();
    });

    it("does not let a second browser replace pending sign-up details", async () => {
        const enrollmentToken = "owner-browser-token";
        mocks.pendingFindUnique.mockResolvedValue({
            createdAt: new Date(Date.now() - 61_000),
            enrollmentTokenHash: crypto.createHash("sha256").update(enrollmentToken).digest("hex"),
            consumedAt: null,
        });
        mocks.cookieGet.mockReturnValue(undefined);

        const result = await requestSignupOtpAction({
            name: "Attacker",
            email: "asha@example.com",
            password: "attacker-password",
            phone: "",
        });

        expect(result.error).toContain("Continue in the browser");
        expect(mocks.pendingUpsert).not.toHaveBeenCalled();
    });

    it("allows a new sign-up after an expired pending registration is cleared", async () => {
        mocks.pendingFindUnique.mockResolvedValue({
            createdAt: new Date(Date.now() - 11 * 60_000),
            expiresAt: new Date(Date.now() - 60_000),
            consumedAt: null,
            enrollmentTokenHash: "a".repeat(64),
        });

        const result = await requestSignupOtpAction({
            name: "Asha Patel",
            email: "asha@example.com",
            password: "safe-password",
            phone: "",
        });

        expect(result).toEqual({ success: true });
        expect(mocks.pendingDeleteMany).toHaveBeenCalledOnce();
        expect(mocks.pendingUpsert).toHaveBeenCalledOnce();
    });

    it("creates exactly one user after a valid verification code", async () => {
        const codeHash = await bcrypt.hash("123456", 10);
        const registration = {
            email: "asha@example.com",
            name: "Asha Patel",
            phone: null,
            passwordHash: "hashed-password",
            codeHash,
            enrollmentTokenHash: "a".repeat(64),
            attempts: 0,
            expiresAt: new Date(Date.now() + 60_000),
            consumedAt: null,
        };
        mocks.pendingFindUnique.mockResolvedValue(registration);
        mocks.pendingUpdateMany.mockResolvedValue({ count: 1 });
        mocks.pendingFindUniqueOrThrow.mockResolvedValue(registration);
        mocks.userCreate.mockResolvedValue({ id: "user_1" });
        mocks.transaction.mockImplementation(async (callback) => callback({
            pendingRegistration: {
                updateMany: mocks.pendingUpdateMany,
                findUniqueOrThrow: mocks.pendingFindUniqueOrThrow,
            },
            user: { findUnique: mocks.userFindUnique, create: mocks.userCreate },
        }));

        const result = await verifySignupOtpAction({ email: registration.email, code: "123456" });

        expect(result).toEqual({ success: true, userId: "user_1" });
        expect(mocks.userCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({ email: registration.email, password: registration.passwordHash }),
        });
    });

    it("does not let an old code consume a replacement sign-up request", async () => {
        const codeHash = await bcrypt.hash("123456", 10);
        const registration = {
            email: "asha@example.com",
            name: "Asha Patel",
            phone: null,
            passwordHash: "hashed-password",
            codeHash,
            enrollmentTokenHash: "a".repeat(64),
            attempts: 0,
            expiresAt: new Date(Date.now() + 60_000),
            consumedAt: null,
        };
        mocks.pendingFindUnique.mockResolvedValue(registration);
        mocks.pendingUpdateMany.mockResolvedValue({ count: 0 });
        mocks.transaction.mockImplementation(async (callback) => callback({
            pendingRegistration: { updateMany: mocks.pendingUpdateMany },
            user: { findUnique: mocks.userFindUnique, create: mocks.userCreate },
        }));

        const result = await verifySignupOtpAction({ email: registration.email, code: "123456" });

        expect(result).toEqual({ error: "Code already used or expired. Request a new one." });
        expect(mocks.pendingUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ codeHash }),
        }));
        expect(mocks.userCreate).not.toHaveBeenCalled();
    });
});
