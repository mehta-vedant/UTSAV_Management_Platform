"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, HelpCircle, Loader2, Paperclip, ShieldCheck, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { ExpenseCategory } from "@prisma/client";
import { toast } from "sonner";
import { getActiveReceipt, type ReceiptListItem } from "./receipt-visibility";
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
    canApplyAiSuggestions: boolean;
}

export default function ReceiptEvidenceManager({ organizationId, expense, receipts, canManage, canApplyAiSuggestions }: ReceiptEvidenceManagerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [useAi, setUseAi] = useState(false);
    const [suggestion, setSuggestion] = useState<Record<string, unknown> | null>(null);
    const [suggestionReceiptId, setSuggestionReceiptId] = useState<string | null>(null);
    const [hasConfirmedSuggestionReview, setHasConfirmedSuggestionReview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const activeReceipt = useMemo(() => getActiveReceipt(receipts), [receipts]);
    const storedSuggestion = activeReceipt?.extractionStatus === "COMPLETED" && activeReceipt.extraction && typeof activeReceipt.extraction === "object"
        ? activeReceipt.extraction as Record<string, unknown>
        : null;
    const reviewSuggestion = suggestion || storedSuggestion;
    const reviewReceiptId = suggestionReceiptId || (storedSuggestion ? activeReceipt?.id || null : null);

    async function upload(file: File) {
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
        setHasConfirmedSuggestionReview(false);
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
        if (file) await upload(file);
    }

    function chooseFile() {
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
        if (!reviewSuggestion || !reviewReceiptId) return;
        setIsLoading(true);
        const result = await applyReceiptSuggestionAction({
            organizationId,
            receiptId: reviewReceiptId,
            title: typeof reviewSuggestion.vendor === "string" && reviewSuggestion.vendor ? reviewSuggestion.vendor : expense.title,
            amount: typeof reviewSuggestion.amount === "number" && reviewSuggestion.amount > 0 ? reviewSuggestion.amount : expense.amount,
            category: Object.values(ExpenseCategory).includes(reviewSuggestion.category as ExpenseCategory) ? reviewSuggestion.category as ExpenseCategory : expense.category,
            notes: [expense.notes, typeof reviewSuggestion.receiptNumber === "string" ? `Receipt: ${reviewSuggestion.receiptNumber}` : ""].filter(Boolean).join("\n"),
        });
        if (result.success) toast.success("Suggestions applied after your review.", { duration: 5000 });
        else toast.error(result.error || "Could not apply suggestions.", { duration: 5000 });
        if (result.success) {
            setSuggestion(null);
            setSuggestionReceiptId(null);
            setHasConfirmedSuggestionReview(false);
        }
        setIsLoading(false);
    }

    return (
        <div className="space-y-2">
            {canManage && !activeReceipt && (
                <div className="flex items-center gap-1.5">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-violet-100 bg-violet-50/70 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide text-violet-900">
                        <input
                            type="checkbox"
                            checked={useAi}
                            disabled={isLoading}
                            onChange={(event) => setUseAi(event.target.checked)}
                            className="h-3 w-3"
                        />
                        <Sparkles className="h-3 w-3 text-violet-600" /> AI suggestions
                    </label>
                    <span className="group relative inline-flex">
                        <HelpCircle className="h-3.5 w-3.5 cursor-help text-slate-400 hover:text-violet-600" aria-label="How AI bill suggestions work" tabIndex={0} />
                        <span role="tooltip" className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-56 rounded-lg bg-slate-900 p-2 text-[10px] font-medium normal-case leading-relaxed tracking-normal text-white shadow-lg group-hover:block group-focus-within:block">
                            Optional. Turn this on before attaching this receipt. Gemini only suggests bill details; you review them before anything changes. It turns off after each upload.
                        </span>
                    </span>
                </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
                {activeReceipt && (
                    <div key={activeReceipt.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                        <button type="button" onClick={() => activeReceipt.status === "UPLOADED" && openReceipt(activeReceipt.id)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600 hover:bg-white disabled:cursor-default" disabled={activeReceipt.status !== "UPLOADED"}>
                            <FileText className="h-3 w-3" /> {activeReceipt.status === "UPLOADED" ? "View receipt" : "Uploading"}
                        </button>
                        {canManage && (
                            <button type="button" onClick={() => removeReceipt(activeReceipt.id)} disabled={isLoading} title={activeReceipt.status === "UPLOADED" ? "Remove receipt" : "Cancel upload"} className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                        )}
                    </div>
                )}
                {canManage && !activeReceipt && (
                    <button type="button" onClick={() => chooseFile()} disabled={isLoading} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-saffron-300 bg-saffron-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-saffron-700 hover:bg-saffron-100 disabled:cursor-not-allowed disabled:opacity-60">
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                        {useAi ? "Attach bill for AI review" : "Attach bill"}
                    </button>
                )}
                <input ref={fileInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={isLoading || !canManage} onChange={handleFileChange} />
            </div>
            {canManage && !activeReceipt && <p className="text-[9px] font-medium text-slate-400">JPG, PNG, WEBP, or PDF · maximum {RECEIPT_MAX_SIZE_LABEL}</p>}
            {reviewSuggestion && reviewReceiptId && (
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-[10px] text-violet-950">
                    <div className="mb-1 flex items-center gap-1 font-black uppercase tracking-wide"><ShieldCheck className="h-3.5 w-3.5" /> Review AI suggestions</div>
                    <dl className="space-y-1 leading-relaxed text-violet-800">
                        <div><dt className="inline font-black">Vendor:</dt> <dd className="inline">{typeof reviewSuggestion.vendor === "string" ? reviewSuggestion.vendor : "Not found"}</dd></div>
                        <div><dt className="inline font-black">Amount:</dt> <dd className="inline">{typeof reviewSuggestion.amount === "number" ? `INR ${reviewSuggestion.amount.toLocaleString("en-IN")}` : "Not found"}</dd></div>
                        <div><dt className="inline font-black">Date:</dt> <dd className="inline">{typeof reviewSuggestion.date === "string" ? reviewSuggestion.date : "Not found"}</dd></div>
                        <div><dt className="inline font-black">Category:</dt> <dd className="inline">{typeof reviewSuggestion.category === "string" ? reviewSuggestion.category.replace("_", " ") : "Not found"}</dd></div>
                        {typeof reviewSuggestion.receiptNumber === "string" && <div><dt className="inline font-black">Receipt no.:</dt> <dd className="inline">{reviewSuggestion.receiptNumber}</dd></div>}
                        {typeof reviewSuggestion.summary === "string" && <div><dt className="inline font-black">Summary:</dt> <dd className="inline">{reviewSuggestion.summary}</dd></div>}
                    </dl>
                    {canApplyAiSuggestions ? (
                        <>
                            <label className="mt-2 flex cursor-pointer items-start gap-1.5 text-violet-800">
                                <input type="checkbox" checked={hasConfirmedSuggestionReview} onChange={(event) => setHasConfirmedSuggestionReview(event.target.checked)} disabled={isLoading} className="mt-0.5" />
                                <span>I reviewed these suggestions against the bill.</span>
                            </label>
                            <button type="button" onClick={applySuggestion} disabled={isLoading || !hasConfirmedSuggestionReview} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-violet-700 px-2 py-1 font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-50"><UploadCloud className="h-3 w-3" /> Confirm and apply</button>
                        </>
                    ) : (
                        <p className="mt-2 font-medium text-violet-700">A Treasurer or Admin can apply these suggestions after reviewing them.</p>
                    )}
                </div>
            )}
        </div>
    );
}
