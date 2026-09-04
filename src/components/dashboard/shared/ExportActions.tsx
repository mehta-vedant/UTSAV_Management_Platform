"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { downloadBlob, csvDownloadBlob, toCsv } from "@/lib/export";
import { downloadPdfDocument } from "@/lib/pdf/download";
import DonationsDocument from "@/lib/pdf/DonationsDocument";
import ExpensesDocument from "@/lib/pdf/ExpensesDocument";

interface ExportActionsProps {
    variant: "donations" | "expenses";
    organizationName: string;
    incomeLabel?: string;
    generatedAt: string;
    csvColumns: string[];
    csvRows: Record<string, string | number>[];
    csvFilename: string;
    pdfFilename: string;
    /* Serialised export payloads (dates as ISO strings). */
    donationsData?: {
        rows: {
            id: string;
            donorName: string;
            amount: number;
            category: string;
            paymentMode: string;
            receivedAt: string;
            notes: string | null;
            eventTitle: string | null;
            recordedBy: string | null;
        }[];
        summary: {
            totalAmount: number;
            count: number;
            byCategory: { category: string; amount: number; count: number }[];
            byPaymentMode: { paymentMode: string; amount: number; count: number }[];
        };
    };
    expensesData?: {
        rows: {
            id: string;
            title: string;
            amount: number;
            category: string;
            paymentMode: string;
            status: string;
            requestedAt: string;
            notes: string | null;
            eventTitle: string | null;
            requestedBy: string | null;
        }[];
        summary: {
            totalAmount: number;
            count: number;
            byStatus: { status: string; amount: number; count: number }[];
            byCategory: { category: string; amount: number; count: number }[];
        };
    };
    disabled?: boolean;
}

export default function ExportActions({
    variant,
    organizationName,
    incomeLabel = "Records",
    generatedAt,
    csvColumns,
    csvRows,
    csvFilename,
    pdfFilename,
    donationsData,
    expensesData,
    disabled = false,
}: ExportActionsProps) {
    const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);
    const generatedAtDate = new Date(generatedAt);

    const buildPdfElement = () => {
        if (variant === "donations" && donationsData) {
            return (
                <DonationsDocument
                    organizationName={organizationName}
                    incomeLabel={incomeLabel}
                    generatedAt={generatedAtDate}
                    data={{
                        rows: donationsData.rows.map((r) => ({ ...r, receivedAt: new Date(r.receivedAt) })),
                        summary: donationsData.summary,
                    }}
                />
            );
        }
        if (variant === "expenses" && expensesData) {
            return (
                <ExpensesDocument
                    organizationName={organizationName}
                    generatedAt={generatedAtDate}
                    data={{
                        rows: expensesData.rows.map((r) => ({ ...r, requestedAt: new Date(r.requestedAt) })),
                        summary: expensesData.summary,
                    }}
                />
            );
        }
        return null;
    };

    const handleCsv = () => {
        if (disabled) return;
        downloadBlob(csvDownloadBlob(toCsv(csvRows, csvColumns)), csvFilename);
    };

    const handlePdf = async () => {
        if (disabled) return;
        const element = buildPdfElement();
        if (!element) return;
        setBusy("pdf");
        try {
            await downloadPdfDocument(element, pdfFilename);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleCsv}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50 hover:border-saffron-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Download className="h-3.5 w-3.5 text-saffron-500" />
                Download CSV
            </button>
            <button
                onClick={() => void handlePdf()}
                disabled={busy === "pdf" || disabled}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
            >
                <Download className="h-3.5 w-3.5" />
                {busy === "pdf" ? "Generating…" : "Download PDF"}
            </button>
        </div>
    );
}