import { describe, expect, it } from "vitest";
import { buildAssistantPrompt, classifyAssistantIntent } from "./admin-assistant.service";

describe("admin assistant intent routing", () => {
    it("maps spending questions to expense breakdown", () => {
        expect(classifyAssistantIntent("Where is our money spent?")).toBe("EXPENSE_BREAKDOWN");
    });

    it("maps pending approval questions to pending expenses", () => {
        expect(classifyAssistantIntent("What expenses are pending approval?")).toBe("PENDING_EXPENSES");
    });

    it("maps event budget questions to event financials", () => {
        expect(classifyAssistantIntent("Which event used the most budget?")).toBe("EVENT_FINANCIALS");
    });

    it("blocks mutation-style requests", () => {
        expect(classifyAssistantIntent("Approve this expense for me")).toBe("UNSUPPORTED_MUTATION");
        expect(classifyAssistantIntent("Invite Rahul as treasurer")).toBe("UNSUPPORTED_MUTATION");
    });
});

describe("admin assistant prompt safety", () => {
    it("uses scoped facts and does not require raw database access instructions", () => {
        const prompt = buildAssistantPrompt(
            "Where is money spent?",
            "EXPENSE_BREAKDOWN",
            {
                intent: "EXPENSE_BREAKDOWN",
                facts: {
                    approvedTotal: 1000,
                    categoryBreakdown: [{ category: "FOOD", amount: 1000 }],
                },
                cards: [],
                citations: [],
            } as any,
            "Approved spending is Rs 1,000."
        );

        expect(prompt).toContain("tenant-scoped data");
        expect(prompt).toContain("FOOD");
        expect(prompt).not.toContain("password");
        expect(prompt).not.toContain("invite token");
    });
});
