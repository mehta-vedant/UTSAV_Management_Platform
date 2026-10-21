import { describe, expect, it } from "vitest";
import { buildCashFlow } from "./reports.service";

describe("buildCashFlow", () => {
    it("orders daily periods by their actual date rather than their display label", () => {
        const points = buildCashFlow(
            [
                { amount: 200, receivedAt: new Date("2026-09-10T12:00:00.000Z") },
                { amount: 100, receivedAt: new Date("2026-09-03T12:00:00.000Z") },
                { amount: 300, receivedAt: new Date("2026-09-20T12:00:00.000Z") },
            ],
            [],
            "daily"
        );

        expect(points.map((point) => point.sortKey)).toEqual([
            "2026-09-03",
            "2026-09-10",
            "2026-09-20",
        ]);
        expect(points[0].chartLabel).toBe("3 Sept");
    });

    it("combines income and expense in the same weekly period", () => {
        const points = buildCashFlow(
            [{ amount: 600, receivedAt: new Date("2026-09-08T12:00:00.000Z") }],
            [{ amount: 250, requestedAt: new Date("2026-09-10T12:00:00.000Z") }],
            "weekly"
        );

        expect(points).toHaveLength(1);
        expect(points[0]).toMatchObject({ income: 600, expense: 250, balance: 350 });
    });
});
