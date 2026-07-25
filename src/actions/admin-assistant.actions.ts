"use server";

import { z } from "zod";
import { actionFailure, actionSuccess } from "@/lib/action-response";
import { answerAdminAssistantQuestion } from "@/modules/assistant/admin-assistant.service";

const AskAdminAssistantSchema = z.object({
    organizationId: z.string().min(1, "Organization is required."),
    question: z.string().trim().min(3, "Ask a slightly more detailed question.").max(500, "Questions must be 500 characters or fewer."),
});

export async function askAdminAssistantAction(input: z.infer<typeof AskAdminAssistantSchema>) {
    try {
        const validated = AskAdminAssistantSchema.parse(input);
        const answer = await answerAdminAssistantQuestion(validated.organizationId, validated.question);
        return actionSuccess(answer);
    } catch (error) {
        return actionFailure(error, "Failed to answer your question.");
    }
}
