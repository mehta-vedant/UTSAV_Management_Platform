import { describe, expect, it, vi } from "vitest";
import { askAdminAssistantAction } from "./admin-assistant.actions";

vi.mock("@/modules/assistant/admin-assistant.service", () => ({
    answerAdminAssistantQuestion: vi.fn(),
}));

describe("admin assistant actions", () => {
    it("returns a structured validation error for very short questions", async () => {
        const result = await askAdminAssistantAction({
            organizationId: "org_1",
            question: "hi",
        });

        expect(result).toMatchObject({
            success: false,
            code: "VALIDATION_ERROR",
            error: "Ask a slightly more detailed question.",
        });
    });
});
