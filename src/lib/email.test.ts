import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
    prisma: {},
}));

describe("email module", () => {
    it("degrades gracefully (returns error, never throws) when SES is not configured", async () => {
        process.env.AWS_ACCESS_KEY_ID = "";
        process.env.AWS_SECRET_ACCESS_KEY = "";
        process.env.SES_FROM_EMAIL = "";

        vi.resetModules();
        const { sendInvitationEmail, sendOtpEmail } = await import("./email");

        const invite = await sendInvitationEmail("a@example.com", "https://app.example.com/invite", "Test Org");
        expect(invite.error).toBe("Email service not configured");

        const otp = await sendOtpEmail("a@example.com", "123456", 10);
        expect(otp.error).toBe("Email service not configured");
    });
});