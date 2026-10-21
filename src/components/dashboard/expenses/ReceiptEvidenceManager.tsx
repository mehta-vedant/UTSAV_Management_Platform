"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Paperclip, RefreshCw, ShieldCheck, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { ExpenseCategory } from "@prisma/client";
import { toast } from "sonner";
import { getVisibleReceipts, type ReceiptListItem } from "./receipt-visibility";
import { RECEIPT_MAX_BYTES, RECEIPT_MAX_SIZE_LABEL } from "@/lib/receipt-constraints";
import {
    applyReceiptSuggestionAction,
    confirmReceiptUploadAction,
    deleteReceiptAction,
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
    const [replacementReceiptId, setReplacementReceiptId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    async function upload(file: File, receiptIdToReplace?: string | null) {
        if (!canManage) return;
        if (file.size > RECEIPT_MAX_BYTES) {
            toast.error(`Choose a receipt smaller than ${RECEIPT_MAX_SIZE_LABEL}.`, { duration: 5000 });
            return;
        }
        // Consent belongs to this one file. Reset it after the attempt so the
        // next receipt always needs an intentional choice from the user.
        const shouldUseAi = useAi;
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
                useAiExtraction: shouldUseAi,
            });
            if (!confirmed.success || !confirmed.data) {
                toast.error(confirmed.error || "The receipt was uploaded but could not be confirmed. Retry later.", { duration: 5000 });
            } else {
                setSuggestion((confirmed.data.extraction as Record<string, unknown> | null) || null);
                setSuggestionReceiptId(started.data.receiptId);
                toast.success(shouldUseAi ? "Receipt saved. Review the AI suggestions below." : "Receipt saved privately.", { duration: 5000 });
                if (receiptIdToReplace) {
                    const removed = await deleteReceiptAction({ organizationId, expenseId: expense.id, receiptId: receiptIdToReplace });
                    if (removed.success) toast.success("Previous receipt replaced.", { duration: 5000 });
                    else toast.error(`New receipt saved, but the previous file remains: ${removed.error || "retry removal."}`, { duration: 5000 });
                }
                router.refresh();
            }
        } catch (error) {
            await markReceiptUploadFailedAction({ organizationId, expenseId: expense.id, receiptId: started.data.receiptId });
            const detail = error instanceof Error ? error.message : "Upload failed.";
            toast.error(`${detail} The expense remains saved; retry after checking S3 setup.`, { duration: 5000 });
        } finally {
            setIsLoading(false);
            setUseAi(false);
        }
    }

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        const receiptIdToReplace = replacementReceiptId;
        setReplacementReceiptId(null);
        if (file) await upload(file, receiptIdToReplace);
    }

    function chooseFile(receiptIdToReplace?: string) {
        setReplacementReceiptId(receiptIdToReplace || null);
        fileInputRef.current?.click();
    }

    async function openReceipt(receiptId: string) {
        const result = await getReceiptDownloadUrlAction(organizationId, receiptId);
        if (result.success && result.data?.url) window.open(result.data.url, "_blank", "noopener,noreferrer");
        else toast.error(result.error || "Could not open this receipt.", { duration: 5000 });
    }

    async function removeReceipt(receiptId: string) {
        if (!window.confirm("Remove this private receipt? This is recorded in the audit trail.")) return;
        setIsLoading(true);
        const result = await deleteReceiptAction({ organizationId, expenseId: expense.id, receiptId });
        if (result.success) {
            toast.success("Receipt removed.", { duration: 5000 });
            router.refresh();
        } else {
            toast.error(result.error || "Could not remove this receipt.", { duration: 5000 });
        }
        setIsLoading(false);
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
            {canManage && (
                <div className="rounded-lg border border-violet-100 bg-violet-50/70 p-2">
                    <label className="flex cursor-pointer items-start gap-2 text-[9px] text-violet-950">
                        <input
                            type="checkbox"
                            checked={useAi}
                            disabled={isLoading}
                            onChange={(event) => setUseAi(event.target.checked)}
                            className="mt-0.5"
                        />
                        <span>
                            <span className="flex items-center gap-1 font-black uppercase tracking-wide">
                                <Sparkles className="h-3 w-3 text-violet-600" /> Optional AI bill suggestions
                            </span>
                            <span className="mt-0.5 block leading-relaxed text-violet-700">
                                Turn this on before attaching this receipt. Gemini suggests details; you review them before anything changes.
                            </span>
                        </span>
                    </label>
                </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
                {getVisibleReceipts(receipts).map((receipt) => (
                    <div key={receipt.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                        <button type="button" onClick={() => receipt.status === "UPLOADED" && openReceipt(receipt.id)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600 hover:bg-white disabled:cursor-default" disabled={receipt.status !== "UPLOADED"}>
                            <FileText className="h-3 w-3" /> {receipt.status === "UPLOADED" ? "View" : "Pending"}
                        </button>
                        {canManage && receipt.status === "UPLOADED" && <>
                            <button type="button" onClick={() => chooseFile(receipt.id)} disabled={isLoading} title="Replace receipt" className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-saffron-700"><RefreshCw className="h-3 w-3" /></button>
                            <button type="button" onClick={() => removeReceipt(receipt.id)} disabled={isLoading} title="Remove receipt" className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                        </>}
                    </div>
                ))}
                {canManage && (
                    <button type="button" onClick={() => chooseFile()} disabled={isLoading} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-saffron-300 bg-saffron-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-saffron-700 hover:bg-saffron-100 disabled:cursor-not-allowed disabled:opacity-60">
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                        {useAi ? "Attach bill for AI review" : "Attach bill"}
                    </button>
                )}
                <input ref={fileInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={isLoading || !canManage} onChange={handleFileChange} />
            </div>
            {canManage && <p className="text-[9px] font-medium text-slate-400">JPG, PNG, WEBP, or PDF · maximum {RECEIPT_MAX_SIZE_LABEL}</p>}
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
