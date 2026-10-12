import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    userFindUnique: vi.fn(),
    userUpsert: vi.fn(),
    verifyOtp: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: { user: { findUnique: mocks.userFindUnique, upsert: mocks.userUpsert } },
}));
vi.mock("@/lib/otp", () => ({ verifyOtp: mocks.verifyOtp }));

import { authOptions } from "./auth";

describe("OTP login provider", () => {
    it("does not create an account for an unknown email", async () => {
        mocks.userFindUnique.mockResolvedValue(null);
        const otpProvider = (authOptions.providers as any[]).find((provider) => provider.options.id === "otp");

        await expect(otpProvider.options.authorize({ email: "new@example.com", code: "123456" })).rejects.toThrow(
            "No account exists for this email. Please create an account first."
        );

        expect(mocks.verifyOtp).not.toHaveBeenCalled();
        expect(mocks.userUpsert).not.toHaveBeenCalled();
    });
});
