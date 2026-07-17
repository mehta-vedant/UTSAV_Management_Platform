import { BhogOfferingWindow, OrganizationStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
    getAvailablePrasadWindows,
    isPrasadWindowAvailable,
    parseDateInput,
} from "./prasad-windows";

const festivalStartDate = parseDateInput("2026-07-17");
const config = {
    morningStart: "08:00",
    morningEnd: "11:00",
    eveningStart: "17:00",
    eveningEnd: "20:00",
};

describe("prasad windows", () => {
    it("hides the morning window after it ends today", () => {
        const windows = getAvailablePrasadWindows({
            selectedDate: parseDateInput("2026-07-17"),
            now: new Date(2026, 6, 17, 12, 0),
            festivalStartDate,
            config,
            status: OrganizationStatus.ACTIVE,
        });

        expect(windows.map((window) => window.value)).toEqual([BhogOfferingWindow.EVENING]);
    });

    it("hides all windows after the evening window ends today", () => {
        const windows = getAvailablePrasadWindows({
            selectedDate: parseDateInput("2026-07-17"),
            now: new Date(2026, 6, 17, 20, 1),
            festivalStartDate,
            config,
            status: OrganizationStatus.ACTIVE,
        });

        expect(windows).toHaveLength(0);
    });

    it("allows both windows on future festival dates", () => {
        const windows = getAvailablePrasadWindows({
            selectedDate: parseDateInput("2026-07-18"),
            now: new Date(2026, 6, 17, 20, 1),
            festivalStartDate,
            config,
            status: OrganizationStatus.ACTIVE,
        });

        expect(windows.map((window) => window.value)).toEqual([
            BhogOfferingWindow.MORNING,
            BhogOfferingWindow.EVENING,
        ]);
    });

    it("rejects submissions outside festival dates and ended festivals", () => {
        expect(isPrasadWindowAvailable({
            selectedDate: parseDateInput("2026-07-16"),
            window: BhogOfferingWindow.MORNING,
            now: new Date(2026, 6, 17, 9, 0),
            festivalStartDate,
            config,
            status: OrganizationStatus.ACTIVE,
        })).toBe(false);

        expect(isPrasadWindowAvailable({
            selectedDate: parseDateInput("2026-07-18"),
            window: BhogOfferingWindow.MORNING,
            now: new Date(2026, 6, 17, 9, 0),
            festivalStartDate,
            config,
            status: OrganizationStatus.ENDED,
        })).toBe(false);
    });
});
