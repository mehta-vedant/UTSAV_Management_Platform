import { describe, expect, it } from "vitest";
import { generateOtpCode, getResendDelaySeconds, OTP_RESEND_INTERVAL_SECONDS } from "./otp";

describe("generateOtpCode", () => {
    it("returns a 6-digit numeric code within the valid range", () => {
        for (let i = 0; i < 500; i++) {
            const code = generateOtpCode();
            expect(code).toMatch(/^\d{6}$/);
            const value = Number(code);
            expect(value).toBeGreaterThanOrEqual(100000);
            expect(value).toBeLessThanOrEqual(999999);
        }
    });
});

describe("getResendDelaySeconds", () => {
    it("returns 0 once the resend window has fully elapsed", () => {
        const createdAt = new Date(Date.now() - (OTP_RESEND_INTERVAL_SECONDS + 30) * 1000);
        expect(getResendDelaySeconds(createdAt)).toBe(0);
    });

    it("returns the remaining wait when recently created", () => {
        const createdAt = new Date(Date.now() - 30 * 1000);
        expect(getResendDelaySeconds(createdAt)).toBe(OTP_RESEND_INTERVAL_SECONDS - 30);
    });

    it("never returns a negative value for future timestamps", () => {
        const createdAt = new Date(Date.now() + 60_000);
        expect(getResendDelaySeconds(createdAt)).toBeGreaterThanOrEqual(OTP_RESEND_INTERVAL_SECONDS);
    });
});