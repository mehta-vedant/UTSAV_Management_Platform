import React from "react";
import { Document, Page, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfHeader, PdfSectionTitle, PdfTable, PdfBarList, PdfSummaryCards, pdfPageStyle } from "./primitives";
import { PDF_COLORS, PDF_PAGE_PADDING } from "./theme";
import type { DonationExportData, DonationExportRow } from "@/modules/finance/donation.service";

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
const fmtDateTime = (date: Date) =>
    `${fmtDate(date)} ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;

const CATEGORY_COLORS: Record<string, string> = {
    GENERAL: PDF_COLORS.saffron,
    SPONSORSHIP: PDF_COLORS.indigo,
    OTHER: PDF_COLORS.slate500,
};

const columnColor = (index: number) => {
    const palette = [PDF_COLORS.saffron, PDF_COLORS.indigo, PDF_COLORS.rose, PDF_COLORS.sky, PDF_COLORS.slate500];
    return palette[index % palette.length];
};

export interface DonationsDocumentProps {
    organizationName: string;
    incomeLabel: string;
    generatedAt: Date;
    data: DonationExportData;
}

export default function DonationsDocument({ organizationName, incomeLabel, generatedAt, data }: DonationsDocumentProps) {
    const { rows, summary } = data;
    const avg = summary.count > 0 ? summary.totalAmount / summary.count : 0;
    const maxCategory = Math.max(1, ...summary.byCategory.map((c) => c.amount));
    const maxPayment = Math.max(1, ...summary.byPaymentMode.map((p) => p.amount));

    const columns = [
        { header: "Date", key: "date" },
        { header: "Donor", key: "donor" },
        { header: "Category", key: "category" },
        { header: "Payment", key: "paymentMode" },
        { header: "Amount", key: "amount", align: "right" as const },
        { header: "Event", key: "event" },
        { header: "Recorded By", key: "recordedBy" },
    ];

    const pageSize = 22;
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

    const rowCells = (row: DonationExportRow) => ({
        date: fmtDate(row.receivedAt),
        donor: row.donorName,
        category: row.category,
        paymentMode: row.paymentMode,
        amount: fmtRupee(row.amount),
        event: row.eventTitle || "—",
        recordedBy: row.recordedBy || "System",
    });

    return (
        <Document title={`${organizationName} — ${incomeLabel}`} author="UTSAV" producer="UTSAV">
            {Array.from({ length: pageCount }).map((_, pageIndex) => {
                const pageRows = rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
                const isFirstPage = pageIndex === 0;
                return (
                    <Page key={pageIndex} size="A4" style={styles.page}>
                        <PdfHeader
                            organizationName={organizationName}
                            title={`${incomeLabel} — ${isFirstPage ? "Register" : "Register · Continued"}`}
                            docType={`Financial Ledger · ${incomeLabel}`}
                            generatedAt={generatedAt}
                        />

                        {isFirstPage && (
                            <>
                                <PdfSectionTitle title="Summary" subtitle="Records in current view" />
                                <PdfSummaryCards
                                    cards={[
                                        { label: `Total ${incomeLabel}`, value: fmtRupee(summary.totalAmount), sub: `${summary.count} record(s)`, color: PDF_COLORS.emerald },
                                        { label: "Average", value: fmtRupee(avg), sub: "per transaction" },
                                        { label: "Payment Modes", value: String(summary.byPaymentMode.length), sub: "used" },
                                    ]}
                                />

                                <PdfSectionTitle title={`By Category`} subtitle="Breakdown across categories" />
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

                                <PdfSectionTitle title="By Payment Mode" subtitle="Breakdown across payment channels" />
                                {summary.byPaymentMode.length > 0 ? (
                                    <PdfBarList
                                        items={summary.byPaymentMode.map((p, i) => ({
                                            label: p.paymentMode,
                                            amount: p.amount,
                                            pct: (p.amount / maxPayment) * 100,
                                            color: columnColor(i),
                                        }))}
                                    />
                                ) : (
                                    <Text style={styles.empty}>No payment mode data.</Text>
                                )}
                            </>
                        )}

                        <PdfSectionTitle
                            title={`${incomeLabel} Transactions`}
                            subtitle={rows.length > 0 ? `${rows.length} record(s)` : "No records"}
                        />

                        {rows.length === 0 ? (
                            <Text style={styles.empty}>No records found.</Text>
                        ) : (
                            <PdfTable columns={columns} rows={pageRows.map(rowCells)} />
                        )}

                        <Text style={styles.footerNote}>
                            <Text>UTSAV {incomeLabel} Register</Text>
                            <Text>Page {pageIndex + 1} of {pageCount}</Text>
                        </Text>
                    </Page>
                );
            })}
        </Document>
    );
}