import React from "react";
import { Document, Page, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfHeader, PdfSectionTitle, PdfTable, PdfBarList, PdfSummaryCards, pdfPageStyle } from "./primitives";
import { PDF_COLORS, PDF_PAGE_PADDING } from "./theme";
import type { ExpenseExportData, ExpenseExportRow } from "@/modules/finance/expense.service";

const styles = StyleSheet.create({
    page: pdfPageStyle,
    empty: {
        fontSize: 8,
        color: PDF_COLORS.slate500,
    },
    footerNote: {
        position: "absolute",
        bottom: PDF_PAGE_PADDING,
        left: PDF_PAGE_PADDING,
        right: PDF_PAGE_PADDING,
        flexDirection: "row",
        justifyContent: "space-between",
        fontSize: 6,
        color: PDF_COLORS.slate400,
    },
});

const fmtRupee = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const fmtDate = (date: Date) =>
    date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const STATUS_COLOR: Record<string, string> = {
    APPROVED: PDF_COLORS.emerald,
    PENDING: PDF_COLORS.saffron,
    REJECTED: PDF_COLORS.rose,
};

const columnColor = (index: number) => {
    const palette = [PDF_COLORS.saffron, PDF_COLORS.indigo, PDF_COLORS.rose, PDF_COLORS.sky, PDF_COLORS.slate500];
    return palette[index % palette.length];
};

const STATUS_ORDER = ["APPROVED", "PENDING", "REJECTED"];

export interface ExpensesDocumentProps {
    organizationName: string;
    generatedAt: Date;
    data: ExpenseExportData;
}

export default function ExpensesDocument({ organizationName, generatedAt, data }: ExpensesDocumentProps) {
    const { rows, summary } = data;
    const maxCategory = Math.max(1, ...summary.byCategory.map((c) => c.amount));
    const maxStatus = Math.max(1, ...summary.byStatus.map((s) => s.amount));

    const approved = summary.byStatus.find((s) => s.status === "APPROVED")?.amount ?? 0;
    const pending = summary.byStatus.find((s) => s.status === "PENDING")?.amount ?? 0;
    const rejected = summary.byStatus.find((s) => s.status === "REJECTED")?.amount ?? 0;

    const sortedStatus = [...summary.byStatus].sort(
        (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
    );

    const columns = [
        { header: "Date", key: "date" },
        { header: "Expense", key: "title" },
        { header: "Category", key: "category" },
        { header: "Payment", key: "paymentMode" },
        { header: "Amount", key: "amount", align: "right" as const },
        { header: "Status", key: "status" },
        { header: "Event", key: "event" },
        { header: "Requested By", key: "requestedBy" },
    ];

    const pageSize = 20;
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

    const rowCells = (row: ExpenseExportRow) => ({
        date: fmtDate(row.requestedAt),
        title: row.title,
        category: row.category,
        paymentMode: row.paymentMode,
        amount: fmtRupee(row.amount),
        status: row.status,
        event: row.eventTitle || "—",
        requestedBy: row.requestedBy || "System",
    });

    return (
        <Document title={`${organizationName} — Expense Register`} author="UTSAV" producer="UTSAV">
            {Array.from({ length: pageCount }).map((_, pageIndex) => {
                const pageRows = rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
                const isFirstPage = pageIndex === 0;
                return (
                    <Page key={pageIndex} size="A4" style={styles.page}>
                        <PdfHeader
                            organizationName={organizationName}
                            title={`Expense Register — ${isFirstPage ? "" : " · Continued"}`}
                            docType="Financial Ledger · Expenses"
                            generatedAt={generatedAt}
                        />

                        {isFirstPage && (
                            <>
                                <PdfSectionTitle title="Summary" subtitle="Records in current view" />
                                <PdfSummaryCards
                                    cards={[
                                        { label: "Total Sum", value: fmtRupee(summary.totalAmount), sub: `${summary.count} request(s)` },
                                        { label: "Approved", value: fmtRupee(approved), sub: "paid out", color: PDF_COLORS.emerald },
                                        { label: "Pending", value: fmtRupee(pending), sub: "awaiting approval", color: PDF_COLORS.saffron },
                                    ]}
                                />

                                <PdfSectionTitle title="By Status" subtitle="Breakdown across approval states" />
                                {sortedStatus.length > 0 ? (
                                    <PdfBarList
                                        items={sortedStatus.map((s, i) => ({
                                            label: s.status,
                                            amount: s.amount,
                                            pct: (s.amount / maxStatus) * 100,
                                            color: STATUS_COLOR[s.status] || columnColor(i),
                                        }))}
                                    />
                                ) : (
                                    <Text style={styles.empty}>No status data.</Text>
                                )}

                                <PdfSectionTitle title="By Category" subtitle="Breakdown across categories" />
                                {summary.byCategory.length > 0 ? (
                                    <PdfBarList
                                        items={summary.byCategory.map((c, i) => ({
                                            label: c.category,
                                            amount: c.amount,
                                            pct: (c.amount / maxCategory) * 100,
                                            color: columnColor(i),
                                        }))}
                                    />
                                ) : (
                                    <Text style={styles.empty}>No category data.</Text>
                                )}
                            </>
                        )}

                        <PdfSectionTitle
                            title="Expense Transactions"
                            subtitle={rows.length > 0 ? `${rows.length} record(s)` : "No records"}
                        />

                        {rows.length === 0 ? (
                            <Text style={styles.empty}>No records found.</Text>
                        ) : (
                            <PdfTable columns={columns} rows={pageRows.map(rowCells)} />
                        )}

                        <Text style={styles.footerNote}>
                            <Text>UTSAV Expense Register</Text>
                            <Text>Page {pageIndex + 1} of {pageCount}</Text>
                        </Text>
                    </Page>
                );
            })}
        </Document>
    );
}