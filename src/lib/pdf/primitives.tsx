import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS, PDF_BODY_FONT, PDF_HEADING_FONT, PDF_PAGE_PADDING } from "./theme";

const s = StyleSheet.create({
    header: {
        borderBottom: 2,
        borderBottomColor: PDF_COLORS.saffron,
        paddingBottom: 12,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    brand: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    brandBox: {
        width: 26,
        height: 26,
        borderRadius: 6,
        backgroundColor: PDF_COLORS.saffron,
        alignItems: "center",
        justifyContent: "center",
    },
    brandMark: {
        color: PDF_COLORS.white,
        fontFamily: PDF_HEADING_FONT,
        fontSize: 12,
    },
    orgName: {
        fontFamily: PDF_HEADING_FONT,
        fontSize: 13,
        color: PDF_COLORS.slate900,
        textTransform: "uppercase",
    },
    reportTitle: {
        fontFamily: PDF_HEADING_FONT,
        fontSize: 11,
        color: PDF_COLORS.slate500,
        textTransform: "uppercase",
    },
    meta: {
        fontSize: 9,
        fontFamily: PDF_BODY_FONT,
        color: PDF_COLORS.slate500,
        textAlign: "right",
    },
    sectionTitle: {
        fontFamily: PDF_HEADING_FONT,
        fontSize: 12,
        color: PDF_COLORS.slate900,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    sectionSub: {
        fontFamily: PDF_BODY_FONT,
        fontSize: 8,
        color: PDF_COLORS.slate500,
        marginBottom: 10,
        textTransform: "uppercase",
    },
    card: {
        backgroundColor: PDF_COLORS.white,
        borderWidth: 1,
        borderColor: PDF_COLORS.slate100,
        borderRadius: 8,
        padding: 12,
        flexGrow: 1,
    },
    cardLabel: {
        fontFamily: PDF_HEADING_FONT,
        fontSize: 7,
        color: PDF_COLORS.slate400,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    cardValue: {
        fontFamily: PDF_HEADING_FONT,
        fontSize: 16,
        color: PDF_COLORS.slate900,
    },
    cardSub: {
        fontFamily: PDF_BODY_FONT,
        fontSize: 7,
        color: PDF_COLORS.slate500,
        textTransform: "uppercase",
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: PDF_COLORS.slate50,
        borderBottomWidth: 1,
        borderBottomColor: PDF_COLORS.slate100,
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 7,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: PDF_COLORS.slate50,
    },
    headerCell: {
        fontFamily: PDF_HEADING_FONT,
        fontSize: 7,
        color: PDF_COLORS.slate500,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    cell: {
        fontFamily: PDF_BODY_FONT,
        fontSize: 8,
        color: PDF_COLORS.slate700,
    },
    tableWrap: {
        borderWidth: 1,
        borderColor: PDF_COLORS.slate100,
        borderRadius: 8,
        overflow: "hidden",
    },
    barTrack: {
        height: 6,
        backgroundColor: PDF_COLORS.slate100,
        borderRadius: 3,
        flexGrow: 1,
    },
    barFill: {
        height: 6,
        borderRadius: 3,
    },
});

interface PdfHeaderProps {
    organizationName: string;
    title: string;
    generatedAt: Date;
    docType?: string;
}

export function PdfHeader({ organizationName, title, generatedAt, docType }: PdfHeaderProps) {
    return (
        <View style={s.header}>
            <View style={s.brand}>
                <View style={s.brandBox}>
                    <Text style={s.brandMark}>U</Text>
                </View>
                <View>
                    <Text style={s.orgName}>{organizationName}</Text>
                    <Text style={s.reportTitle}>{docType}</Text>
                </View>
            </View>
            <Text style={s.meta}>
                Generated {generatedAt.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {"\n"}
                {title}
            </Text>
        </View>
    );
}

export function PdfSectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <View style={{ marginTop: 18 }}>
            <Text style={s.sectionTitle}>{title}</Text>
            {subtitle ? <Text style={s.sectionSub}>{subtitle}</Text> : <View style={{ marginBottom: 8 }} />}
        </View>
    );
}

export function PdfSummaryCards({ cards }: { cards: { label: string; value: string; sub: string; color?: string }[] }) {
    return (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
            {cards.map((card, i) => {
                const valueStyle = card.color ? { ...s.cardValue, color: card.color } : s.cardValue;
                return (
                    <View key={i} style={s.card}>
                        <Text style={s.cardLabel}>{card.label}</Text>
                        <Text style={valueStyle}>{card.value}</Text>
                        <Text style={s.cardSub}>{card.sub}</Text>
                    </View>
                );
            })}
        </View>
    );
}

interface PdfTableProps {
    columns: { header: string; key: string; align?: "left" | "right" }[];
    rows: Record<string, string | number>[];
}

export function PdfTable({ columns, rows }: PdfTableProps) {
    return (
        <View style={s.tableWrap}>
            <View style={s.tableHeaderRow}>
                {columns.map((col) => (
                    <Text key={col.key} style={[s.headerCell, col.align === "right" ? { textAlign: "right", flex: 1 } : { flex: 1 }]}>
                        {col.header}
                    </Text>
                ))}
            </View>
            {rows.map((row, i) => (
                <View key={i} style={s.tableRow}>
                    {columns.map((col) => (
                        <Text key={col.key} style={[s.cell, col.align === "right" ? { textAlign: "right", flex: 1 } : { flex: 1 }]}>
                            {row[col.key]}
                        </Text>
                    ))}
                </View>
            ))}
        </View>
    );
}

export function PdfBarList({
    items,
}: {
    items: { label: string; amount: number; pct: number; color: string }[];
    totalLabel?: string;
}) {
    return (
        <View style={{ gap: 8 }}>
            {items.map((item, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ width: 70, fontFamily: PDF_HEADING_FONT, fontSize: 7.5, color: PDF_COLORS.slate700, textTransform: "uppercase" }}>
                        {item.label}
                    </Text>
                    <View style={s.barTrack}>
                        <View style={[s.barFill, { backgroundColor: item.color, width: `${item.pct}%` }]} />
                    </View>
                    <Text style={{ width: 48, textAlign: "right", fontFamily: PDF_HEADING_FONT, fontSize: 8, color: PDF_COLORS.slate900 }}>
                        {item.amount.toLocaleString("en-IN")}
                    </Text>
                </View>
            ))}
        </View>
    );
}

export const pdfPageStyle = {
    paddingTop: PDF_PAGE_PADDING,
    paddingBottom: PDF_PAGE_PADDING,
    paddingHorizontal: PDF_PAGE_PADDING,
    backgroundColor: PDF_COLORS.white,
    fontFamily: PDF_BODY_FONT,
    color: PDF_COLORS.slate700,
} as const;