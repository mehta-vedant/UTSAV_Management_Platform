/**
 * Minimal CSV generation helpers (no external dependency).
 * Produces RFC-4180-ish CSV that opens cleanly in Excel/Google Sheets.
 */

/** Escape a single field for CSV (handles commas, quotes, newlines). */
export function csvEscape(value: unknown): string {
    const str = value == null ? "" : String(value);
    if (/[",\n\r]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/** Convert an array of objects into a CSV string using the given column order. */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
    const header = columns.map(csvEscape).join(",");
    const body = rows.map((row) =>
        columns.map((col) => csvEscape(row[col])).join(",")
    );
    return [header, ...body].join("\r\n");
}

/** Build a downloadable Blob given a CSV string. */
export function csvDownloadBlob(csv: string): Blob {
    // BOM so Excel interprets UTF-8 (₹ / rupee sign) correctly.
    return new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
}

/** Trigger a client-side download of a Blob under the given filename. */
export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

/** Format an amount for CSV display (plain digits, no currency symbol). */
export function formatAmountForCsv(value: number): number {
    return Math.round(value);
}

/** Format a Date as YYYY-MM-DD for stable sorting in spreadsheets. */
export function formatDateForCsv(date: Date): string {
    return date.toISOString().slice(0, 10);
}