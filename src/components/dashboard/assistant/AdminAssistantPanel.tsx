"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Bot, Loader2, MessageSquareText, Send, Sparkles, X } from "lucide-react";
import { askAdminAssistantAction } from "@/actions/admin-assistant.actions";
import { cn } from "@/lib/utils";

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

const STARTERS = [
    "Where is our money spent?",
    "How much have we collected?",
    "What expenses are pending?",
    "Which event used the most budget?",
    "Summarize recent financial activity.",
];

export default function AdminAssistantPanel({
    organizationId,
    organizationName,
}: {
    organizationId: string;
    organizationName: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [question, setQuestion] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Ask me about collections, spending, pending approvals, event budgets, or recent activity. I can summarize data, but I cannot change records.",
        },
    ]);
    const inputRef = useRef<HTMLInputElement>(null);

    const canSubmit = useMemo(() => question.trim().length >= 3 && !isLoading, [question, isLoading]);

    async function submitQuestion(nextQuestion?: string) {
        const prompt = (nextQuestion || question).trim();
        if (prompt.length < 3 || isLoading) return;

        setQuestion("");
        setIsLoading(true);
        setMessages((current) => [
            ...current,
            { id: crypto.randomUUID(), role: "user", content: prompt },
        ]);

        const result = await askAdminAssistantAction({ organizationId, question: prompt });

        if (result.success && "data" in result) {
            const cards = result.data.cards?.length
                ? "\n\n" + result.data.cards.map((card) => `${card.title}: ${card.value}${card.description ? ` (${card.description})` : ""}`).join("\n")
                : "";
            setMessages((current) => [
                ...current,
                { id: crypto.randomUUID(), role: "assistant", content: `${result.data.answer}${cards}` },
            ]);
        } else {
            setMessages((current) => [
                ...current,
                { id: crypto.randomUUID(), role: "assistant", content: result.error || "I could not answer that right now. Please try again." },
            ]);
        }

        setIsLoading(false);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        submitQuestion();
    }

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setIsOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 80);
                }}
                className={cn(
                    "fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-2xl shadow-slate-900/30 transition-all hover:bg-saffron-500 active:scale-95",
                    isOpen && "pointer-events-none scale-90 opacity-0"
                )}
                aria-label="Open admin assistant"
            >
                <MessageSquareText className="h-6 w-6" />
            </button>

            {isOpen && (
                <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[420px] sm:inset-x-auto sm:right-5 sm:mx-0">
                    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-saffron-500">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 text-sm font-black uppercase tracking-tight">
                                        UTSAV Assistant <Sparkles className="h-3.5 w-3.5 text-saffron-300" />
                                    </div>
                                    <div className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        Read-only for {organizationName}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                                aria-label="Close admin assistant"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[52vh] min-h-[320px] space-y-4 overflow-y-auto bg-slate-50 p-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed",
                                        message.role === "user"
                                            ? "ml-auto bg-saffron-500 text-white"
                                            : "mr-auto border border-slate-200 bg-white text-slate-700 shadow-sm"
                                    )}
                                >
                                    {message.content}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="mr-auto flex max-w-[88%] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm">
                                    <Loader2 className="h-4 w-4 animate-spin text-saffron-500" />
                                    Checking safe organization data...
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-100 bg-white p-4">
                            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                                {STARTERS.map((starter) => (
                                    <button
                                        key={starter}
                                        type="button"
                                        disabled={isLoading}
                                        onClick={() => submitQuestion(starter)}
                                        className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 transition-colors hover:border-saffron-200 hover:bg-saffron-50 hover:text-saffron-700 disabled:opacity-50"
                                    >
                                        {starter}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    value={question}
                                    onChange={(event) => setQuestion(event.target.value)}
                                    maxLength={500}
                                    placeholder="Ask about spending, donations, events..."
                                    className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition-colors focus:border-saffron-400 focus:bg-white"
                                />
                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white transition-colors hover:bg-saffron-500 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Ask assistant"
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
