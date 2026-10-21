"use client";

import { ChangeEvent, useState } from "react";
import { FileText, Loader2, Paperclip, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { ExpenseCategory } from "@prisma/client";
import { toast } from "sonner";
import { getVisibleReceipts, type ReceiptListItem } from "./receipt-visibility";
import {
    applyReceiptSuggestionAction,
    confirmReceiptUploadAction,
    getReceiptDownloadUrlAction,
    markReceiptUploadFailedAction,
    startReceiptUploadAction,
} from "@/actions/receipt.actions";

interface ReceiptEvidenceManagerProps {
    organizationId: string;
    expense: {
        id: string;
        title: string;
        amount: number;
        category: ExpenseCategory;
        notes?: string | null;
    };
    receipts: ReceiptListItem[];
    canManage: boolean;
}

export default function ReceiptEvidenceManager({ organizationId, expense, receipts, canManage }: ReceiptEvidenceManagerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [useAi, setUseAi] = useState(false);
    const [suggestion, setSuggestion] = useState<Record<string, unknown> | null>(null);
    const [suggestionReceiptId, setSuggestionReceiptId] = useState<string | null>(null);

    async function upload(file: File) {
        if (!canManage) return;
        setIsLoading(true);
        setSuggestion(null);
        setSuggestionReceiptId(null);
        const started = await startReceiptUploadAction({
            organizationId,
            expenseId: expense.id,
            fileName: file.name,
            contentType: file.type,
            byteSize: file.size,
        });

        if (!started.success || !started.data) {
            toast.error(started.error || "Could not start the receipt upload.", { duration: 5000 });
            setIsLoading(false);
            return;
        }
        if (started.data.status === "FAILED" || !("post" in started.data)) {
            toast.error(started.data.message || "Receipt upload could not start. Check storage setup and retry.", { duration: 5000 });
            setIsLoading(false);
            return;
        }

        try {
            const form = new FormData();
            Object.entries(started.data.post.fields).forEach(([key, value]) => form.append(key, value));
            form.append("file", file);
            const response = await fetch(started.data.post.url, { method: "POST", body: form });
            if (!response.ok && response.status !== 201 && response.status !== 204) {
                throw new Error(`S3 rejected the upload (HTTP ${response.status}).`);
            }
            const confirmed = await confirmReceiptUploadAction({
                organizationId,
                expenseId: expense.id,
                receiptId: started.data.receiptId,
                useAiExtraction: useAi,
            });
            if (!confirmed.success || !confirmed.data) {
                toast.error(confirmed.error || "The receipt was uploaded but could not be confirmed. Retry later.", { duration: 5000 });
            } else {
                setSuggestion((confirmed.data.extraction as Record<string, unknown> | null) || null);
                setSuggestionReceiptId(started.data.receiptId);
                toast.success(useAi ? "Receipt saved. Review the AI suggestions below." : "Receipt saved privately.", { duration: 5000 });
            }
        } catch (error) {
            await markReceiptUploadFailedAction({ organizationId, expenseId: expense.id, receiptId: started.data.receiptId });
            const detail = error instanceof Error ? error.message : "Upload failed.";
            toast.error(`${detail} The expense remains saved; retry after checking S3 setup.`, { duration: 5000 });
        } finally {
            setIsLoading(false);
        }
    }

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) await upload(file);
    }

    async function openReceipt(receiptId: string) {
        const result = await getReceiptDownloadUrlAction(organizationId, receiptId);
        if (result.success && result.data?.url) window.open(result.data.url, "_blank", "noopener,noreferrer");
        else toast.error(result.error || "Could not open this receipt.", { duration: 5000 });
    }

    async function applySuggestion() {
        if (!suggestion) return;
        setIsLoading(true);
        const result = await applyReceiptSuggestionAction({
            organizationId,
            receiptId: suggestionReceiptId || "",
            title: typeof suggestion.vendor === "string" && suggestion.vendor ? suggestion.vendor : expense.title,
            amount: typeof suggestion.amount === "number" && suggestion.amount > 0 ? suggestion.amount : expense.amount,
            category: Object.values(ExpenseCategory).includes(suggestion.category as ExpenseCategory) ? suggestion.category as ExpenseCategory : expense.category,
            notes: [expense.notes, typeof suggestion.receiptNumber === "string" ? `Receipt: ${suggestion.receiptNumber}` : ""].filter(Boolean).join("\n"),
        });
        if (result.success) toast.success("Suggestions applied after your review.", { duration: 5000 });
        else toast.error(result.error || "Could not apply suggestions.", { duration: 5000 });
        if (result.success) {
            setSuggestion(null);
            setSuggestionReceiptId(null);
        }
        setIsLoading(false);
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                {getVisibleReceipts(receipts).map((receipt) => (
                    <button key={receipt.id} type="button" onClick={() => receipt.status === "UPLOADED" && openReceipt(receipt.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600 hover:border-saffron-300 disabled:cursor-default" disabled={receipt.status !== "UPLOADED"}>
                        <FileText className="h-3 w-3" /> {receipt.status === "UPLOADED" ? "Receipt" : "Receipt pending"}
                    </button>
                ))}
                {canManage && (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-saffron-300 bg-saffron-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-saffron-700 hover:bg-saffron-100">
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                        Attach bill
                        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={isLoading} onChange={handleFileChange} />
                    </label>
                )}
            </div>
            {canManage && (
                <label title="Allow Gemini to read this receipt only to suggest bill details. You review every suggestion before applying it." className="inline-flex cursor-pointer items-center gap-1.5 text-[9px] font-bold text-slate-500">
                    <input type="checkbox" checked={useAi} onChange={(event) => setUseAi(event.target.checked)} />
                    <Sparkles className="h-3 w-3 text-saffron-500" /> Use AI suggestions
                </label>
            )}
            {suggestion && (
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-[10px] text-violet-950">
                    <div className="mb-1 flex items-center gap-1 font-black uppercase tracking-wide"><ShieldCheck className="h-3.5 w-3.5" /> AI suggestions — review before applying</div>
                    <p>{typeof suggestion.vendor === "string" ? suggestion.vendor : "Vendor unclear"}{typeof suggestion.amount === "number" ? ` · Rs ${suggestion.amount}` : ""}{typeof suggestion.date === "string" ? ` · ${suggestion.date}` : ""}</p>
                    <button type="button" onClick={applySuggestion} disabled={isLoading} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-violet-700 px-2 py-1 font-black uppercase tracking-wide text-white"><UploadCloud className="h-3 w-3" /> Apply reviewed suggestions</button>
                </div>
            )}
        </div>
    );
}
