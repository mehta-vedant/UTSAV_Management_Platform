import { Prisma } from "@prisma/client";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FinancialHero from "./FinancialHero";

vi.mock("next/navigation", () => ({
    usePathname: () => "/ganesh-festival",
}));

describe("FinancialHero", () => {
    it("uses Festival public fundraising language", () => {
        render(
            React.createElement(FinancialHero, {
                financials: {
                    totalDonations: new Prisma.Decimal(5000),
                    totalExpenses: new Prisma.Decimal(1000),
                    remainingBalance: new Prisma.Decimal(4000),
                    fundraisingTarget: new Prisma.Decimal(10000),
                    utilizationRate: 20,
                    isOverspent: false,
                },
            })
        );

        expect(screen.getByText("Fundraising Goal")).toBeInTheDocument();
        expect(screen.queryByText("Budget Target")).not.toBeInTheDocument();
    });
});
