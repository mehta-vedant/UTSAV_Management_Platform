import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfHeader, PdfSectionTitle, PdfSummaryCards, PdfTable, PdfBarList, pdfPageStyle } from "./primitives";
import { PDF_COLORS } from "./theme";

const styles = StyleSheet.create({
    page: pdfPageStyle,
});

const fmtRupee = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export interface ReportsPdfProps {
    organizationName: string;
    incomeLabel: string;
    bucketLabel: string;
    generatedAt: Date;
    data: {
        cashFlow: { label: string; income: number; expense: number; balance: number }[];
        donationCategories: { category: string; amount: number; count: number }[];
        expenseCategories: { category: string; amount: number; count: number }[];
        incomePaymentModes: { mode: string; amount: number }[];
        expensePaymentModes: { mode: string; amount: number }[];
        eventBudgets: { title: string; budgetTarget: number; spent: number; remaining: number; utilization: number }[];
        totals: {
            totalDonations: number;
            totalApprovedExpenses: number;
            balance: number;
            donationCount: number;
            approvedExpenseCount: number;
            eventCount: number;
        };
    };
}

export default function ReportsDocument({ organizationName, incomeLabel, bucketLabel, generatedAt, data }: ReportsPdfProps) {
    const { totals } = data;

    const donationBars = withPercent(data.donationCategories, (c) => c.amount, PDF_COLORS.saffron);
    const expenseBars = withPercent(data.expenseCategories, (c) => c.amount, PDF_COLORS.rose);
    const incomeModeBars = data.incomePaymentModes.map((m) => ({
        label: m.mode.replace("_", " "),
        amount: m.amount,
        pct: percent(m.amount, data.incomePaymentModes.reduce((s, x) => s + x.amount, 0)),
        color: pickModeColor(m.mode),
    }));
    const expenseModeBars = data.expensePaymentModes.map((m) => ({
        label: m.mode.replace("_", " "),
        amount: m.amount,
        pct: percent(m.amount, data.expensePaymentModes.reduce((s, x) => s + x.amount, 0)),
        color: pickModeColor(m.mode),
    }));

    return (
        <Document title={`${organizationName} — Financial Reports`} author="UTSAV" producer="UTSAV">
            <Page size="A4" style={styles.page}>
                <PdfHeader
                    organizationName={organizationName}
                    title={`${bucketLabel} Financial Report`}
                    docType="Reports"
                    generatedAt={generatedAt}
                />

                <PdfSummaryCards
                    cards={[
                        { label: `Total ${incomeLabel}`, value: fmtRupee(totals.totalDonations), sub: `${totals.donationCount} records`, color: PDF_COLORS.emerald },
                        { label: "Approved Expenses", value: fmtRupee(totals.totalApprovedExpenses), sub: `${totals.approvedExpenseCount} approved`, color: PDF_COLORS.rose },
                        { label: "Net Balance", value: fmtRupee(totals.balance), sub: totals.balance < 0 ? "Overspent" : "Healthy", color: totals.balance < 0 ? PDF_COLORS.rose : PDF_COLORS.emerald },
                    ]}
                />

                <PdfSectionTitle title="Cash Flow Over Time" subtitle="Income vs expenses (balances in rupees)" />
                {data.cashFlow.length === 0 ? (
                    <Text style={{ fontSize: 8, color: PDF_COLORS.slate500, marginTop: 8 }}>No financial activity recorded yet.</Text>
                ) : (
                    data.cashFlow.map((point, i) => (
                        <View key={i} style={{ marginBottom: 4 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 1 }}>
                                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7.5, color: PDF_COLORS.slate700, width: 110 }}>
                                    {point.label}
                                </Text>
                                <Text style={{ fontSize: 7.5, color: PDF_COLORS.slate600 }}>
                                    In {fmtRupee(point.income)} · Out {fmtRupee(point.expense)}
                                </Text>
                            </View>
                            <View style={{ flexDirection: "row", gap: 2 }}>
                                <View style={{ flex: Math.max(0.5, point.income), height: 3, backgroundColor: PDF_COLORS.emerald, borderRadius: 1.5, minWidth: point.income > 0 ? 2 : 0 }} />
                                <View style={{ flex: Math.max(0.5, point.expense), height: 3, backgroundColor: PDF_COLORS.rose, borderRadius: 1.5, minWidth: point.expense > 0 ? 2 : 0 }} />
                            </View>
                        </View>
                    ))
                )}

                <PdfSectionTitle title={`${incomeLabel} by Category`} subtitle="Contribution split by category" />
                {donationBars.length === 0 ? (
                    <Text style={{ fontSize: 8, color: PDF_COLORS.slate500 }}>No data yet.</Text>
                ) : (
                    <PdfBarList items={donationBars} />
                )}

                <PdfSectionTitle title="Expenses by Category" subtitle="Approved spend by category" />
                {expenseBars.length === 0 ? (
                    <Text style={{ fontSize: 8, color: PDF_COLORS.slate500 }}>No data yet.</Text>
                ) : (
                    <PdfBarList items={expenseBars} />
                )}
            </Page>

            <Page size="A4" style={styles.page}>
                <PdfHeader
                    organizationName={organizationName}
                    title={`${bucketLabel} Financial Report`}
                    docType="Reports · Continuation"
                    generatedAt={generatedAt}
                />

                <PdfSectionTitle title={`${incomeLabel} by Payment Mode`} subtitle="How funds were received" />
                {incomeModeBars.length === 0 ? (
                    <Text style={{ fontSize: 8, color: PDF_COLORS.slate500 }}>No data yet.</Text>
                ) : (
                    <PdfBarList items={incomeModeBars} />
                )}

                <PdfSectionTitle title="Expenses by Payment Mode" subtitle="How payments were made" />
                {expenseModeBars.length === 0 ? (
                    <Text style={{ fontSize: 8, color: PDF_COLORS.slate500 }}>No data yet.</Text>
                ) : (
                    <PdfBarList items={expenseModeBars} />
                )}

                <PdfSectionTitle title="Event Budget Utilization" subtitle="Budget vs approved spend per event" />
                {data.eventBudgets.length === 0 ? (
                    <Text style={{ fontSize: 8, color: PDF_COLORS.slate500 }}>No events created yet.</Text>
                ) : (
                    <PdfTable
                        columns={[
                            { header: "Event", key: "event" },
                            { header: "Budget", key: "budget", align: "right" },
                            { header: "Spent", key: "spent", align: "right" },
                            { header: "Remaining", key: "remaining", align: "right" },
                            { header: "Utilization", key: "utilization", align: "right" },
                        ]}
                        rows={data.eventBudgets.map((e) => ({
                            event: e.title,
                            budget: fmtRupee(e.budgetTarget),
                            spent: fmtRupee(e.spent),
                            remaining: fmtRupee(e.remaining),
                            utilization: `${e.utilization.toFixed(1)}%`,
                        }))}
                    />
                )}
            </Page>
        </Document>
    );
}

function percent(part: number, total: number): number {
    if (total <= 0) return 0;
    return (part / total) * 100;
}

function withPercent<T extends { category: string; amount: number }>(
    items: T[],
    getAmount: (item: T) => number,
    color: string
) {
    const total = items.reduce((s, item) => s + getAmount(item), 0);
    return items.map((item) => ({
        label: item.category,
        amount: getAmount(item),
        pct: percent(getAmount(item), total),
        color,
    }));
}

function pickModeColor(mode: string): string {
    switch (mode) {
        case "CASH":
            return PDF_COLORS.emerald;
        case "UPI":
            return PDF_COLORS.saffron;
        case "BANK_TRANSFER":
            return PDF_COLORS.blue;
        default:
            return PDF_COLORS.violet;
    }
}