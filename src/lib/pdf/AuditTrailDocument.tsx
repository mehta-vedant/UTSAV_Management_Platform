import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfHeader, PdfSectionTitle, PdfTable, pdfPageStyle } from "./primitives";
import { PDF_COLORS } from "./theme";

const styles = StyleSheet.create({
    page: pdfPageStyle,
});

const fmtRupee = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export interface AuditTrailEntryPdf {
    date: string;
    time: string;
    type: "INCOME" | "EXPENSE";
    title: string;
    detail: string | null;
    category: string;
    paymentMode: string | null;
    status: string | null;
    source: string;
    actor: string | null;
    eventTitle: string | null;
    amount: number;
}

export interface AuditTrailPdfProps {
    organizationName: string;
    incomeLabel: string;
    generatedAt: Date;
    totals: { income: number; expense: number; balance: number };
    entries: AuditTrailEntryPdf[];
}

export default function AuditTrailDocument({ organizationName, incomeLabel, generatedAt, totals, entries }: AuditTrailPdfProps) {
    const columns = [
        { header: "Date", key: "date" },
        { header: "Description", key: "title" },
        { header: "Category", key: "category" },
        { header: "Payment", key: "paymentMode" },
        { header: "Status", key: "status" },
        { header: "Activity By", key: "activityBy" },
    ];

    const half = Math.ceil(entries.length / 2);
    const page1Rows = entries.length === 0 ? [] : entries.slice(0, half);
    const page2Rows = entries.slice(half);
    const hasTooMany = entries.length > 24;

    return (
        <Document title={`${organizationName} — Audit Trail`} author="UTSAV" producer="UTSAV">
            <Page size="A4" style={styles.page}>
                <PdfHeader organizationName={organizationName} title="Audit Trail Ledger" docType="Financial Ledger" generatedAt={generatedAt} />

                <PdfSectionTitle title="Summary" subtitle="Total ledger balances" />

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {[
                        { label: `Total ${incomeLabel}`, value: fmtRupee(totals.income), color: PDF_COLORS.emerald },
                        { label: "Total Expenses", value: fmtRupee(totals.expense), color: PDF_COLORS.rose },
                        { label: "Net Balance", value: fmtRupee(totals.balance), color: totals.balance < 0 ? PDF_COLORS.rose : PDF_COLORS.emerald },
                    ].map((card, i) => (
                        <View key={i} style={{ width: "30%", backgroundColor: PDF_COLORS.white, borderWidth: 1, borderColor: PDF_COLORS.slate100, borderRadius: 8, padding: 10 }}>
                            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7, color: PDF_COLORS.slate400, textTransform: "uppercase", marginBottom: 2 }}>
                                {card.label}
                            </Text>
                            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: card.color }}>{card.value}</Text>
                        </View>
                    ))}
                </View>

                <PdfSectionTitle title="Transactions" subtitle={entries.length > 0 ? `${entries.length} record(s)` : "No records"} />

                {entries.length === 0 ? (
                    <Text style={{ fontSize: 8, color: PDF_COLORS.slate500 }}>No records found.</Text>
                ) : hasTooMany ? (
                    <PdfTable
                        columns={columns}
                        rows={entries.map((e) => ({
                            date: e.date,
                            title: `${e.title}${e.eventTitle ? ` (${e.eventTitle})` : ""}`,
                            category: e.category,
                            paymentMode: e.paymentMode || "—",
                            status: e.status || (e.type === "INCOME" ? "Received" : "—"),
                            activityBy: e.source,
                        }))}
                    />
                ) : (
                    <PdfTable
                        columns={[
                            { header: "Date", key: "date" },
                            { header: "Description", key: "title" },
                            { header: "Category", key: "category" },
                            { header: "Payment", key: "paymentMode" },
                            { header: "Status", key: "status" },
                            { header: "Amount", key: "amount", align: "right" },
                        ]}
                        rows={page1Rows.map((e) => ({
                            date: e.date,
                            title: e.title,
                            category: e.category,
                            paymentMode: e.paymentMode || "—",
                            status: e.status || (e.type === "INCOME" ? "Received" : "—"),
                            amount: `${e.type === "INCOME" ? "+" : "-"} ${fmtRupee(e.amount)}`,
                        }))}
                    />
                )}
            </Page>

            {hasTooMany && (
                <Page size="A4" style={styles.page}>
                    <PdfHeader organizationName={organizationName} title="Audit Trail Ledger" docType="Financial Ledger · Continued" generatedAt={generatedAt} />
                    <PdfSectionTitle title="Transactions (continued)" subtitle={`${entries.length} record(s)`} />
                    <PdfTable
                        columns={[
                            { header: "Date", key: "date" },
                            { header: "Description", key: "title" },
                            { header: "Category", key: "category" },
                            { header: "Payment", key: "paymentMode" },
                            { header: "Status", key: "status" },
                            { header: "Amount", key: "amount", align: "right" },
                        ]}
                        rows={page2Rows.map((e) => ({
                            date: e.date,
                            title: e.title,
                            category: e.category,
                            paymentMode: e.paymentMode || "—",
                            status: e.status || (e.type === "INCOME" ? "Received" : "—"),
                            amount: `${e.type === "INCOME" ? "+" : "-"} ${fmtRupee(e.amount)}`,
                        }))}
                    />
                </Page>
            )}
        </Document>
    );
}