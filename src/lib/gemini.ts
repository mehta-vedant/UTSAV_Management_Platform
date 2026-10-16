import { GoogleGenAI } from "@google/genai";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export async function generateGeminiText(prompt: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: {
            temperature: 0.2,
            maxOutputTokens: 800,
        },
    });

    return response.text?.trim() || null;
}

export async function generateGeminiReceiptJson(input: { bytes: Uint8Array; contentType: string }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
        contents: [{
            role: "user",
            parts: [
                {
                    text: [
                        "Read this receipt only to suggest fields for a human reviewer.",
                        "Return JSON only with: vendor (string|null), amount (number|null), date (ISO date string|null), category (one of IDOL, DECORATION, LIGHTING, FOOD, SOUND, SECURITY, EQUIPMENT, MARKETING, INFRASTRUCTURE, TRAVEL, RENTAL, OPERATIONS, MISCELLANEOUS or null), receiptNumber (string|null), summary (string|null).",
                        "Do not make up information. Use null when unclear.",
                    ].join("\n"),
                },
                { inlineData: { mimeType: input.contentType, data: Buffer.from(input.bytes).toString("base64") } },
            ],
        }],
        config: {
            temperature: 0,
            maxOutputTokens: 500,
            responseMimeType: "application/json",
        },
    });

    if (!response.text) return null;
    return JSON.parse(response.text) as unknown;
}
