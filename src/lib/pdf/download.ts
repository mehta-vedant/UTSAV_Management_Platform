"use client";

import { pdf } from "@react-pdf/renderer";
import type React from "react";
import { downloadBlob } from "@/lib/export";

/**
 * Render a react-pdf <Document> element to a Blob and trigger a download.
 * Must be called from a client component (relies on browser APIs).
 */
export async function downloadPdfDocument(documentElement: React.ReactElement, filename: string) {
    const blob = await pdf(documentElement).toBlob();
    downloadBlob(blob, filename);
}

/** Build a timestamped, url-safe filename for a PDF export. */
export function pdfFilename(prefix: string): string {
    return `${prefix}-${new Date().toISOString().slice(0, 10)}.pdf`;
}