import { describe, expect, it, vi } from "vitest";
import { generateGeminiText } from "./gemini";

vi.mock("@google/genai", () => ({
    GoogleGenAI: vi.fn(),
}));

describe("generateGeminiText", () => {
    it("returns null when GEMINI_API_KEY is not configured", async () => {
        const original = process.env.GEMINI_API_KEY;
        delete process.env.GEMINI_API_KEY;

        await expect(generateGeminiText("hello")).resolves.toBeNull();

        process.env.GEMINI_API_KEY = original;
    });
});
