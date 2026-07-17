import { BhogOfferingWindow, OrganizationStatus } from "@prisma/client";

export type PrasadWindowConfig = {
    morningStart?: string | null;
    morningEnd?: string | null;
    eveningStart?: string | null;
    eveningEnd?: string | null;
};

type NormalizedPrasadWindowConfig = {
    morningStart: string;
    morningEnd: string;
    eveningStart: string;
    eveningEnd: string;
};

export type PrasadWindowOption = {
    value: BhogOfferingWindow;
    label: string;
    start: string;
    end: string;
};

export const DEFAULT_PRASAD_WINDOWS: NormalizedPrasadWindowConfig = {
    morningStart: "08:00",
    morningEnd: "11:00",
    eveningStart: "17:00",
    eveningEnd: "20:00",
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function normalizePrasadWindowConfig(config?: PrasadWindowConfig | null): NormalizedPrasadWindowConfig {
    return {
        morningStart: isValidTime(config?.morningStart) ? config!.morningStart! : DEFAULT_PRASAD_WINDOWS.morningStart,
        morningEnd: isValidTime(config?.morningEnd) ? config!.morningEnd! : DEFAULT_PRASAD_WINDOWS.morningEnd,
        eveningStart: isValidTime(config?.eveningStart) ? config!.eveningStart! : DEFAULT_PRASAD_WINDOWS.eveningStart,
        eveningEnd: isValidTime(config?.eveningEnd) ? config!.eveningEnd! : DEFAULT_PRASAD_WINDOWS.eveningEnd,
    };
}

export function isValidTime(value: string | null | undefined) {
    return !!value && TIME_RE.test(value);
}

export function assertValidPrasadWindowConfig(config: PrasadWindowConfig) {
    const normalized = normalizePrasadWindowConfig(config);
    if (timeToMinutes(normalized.morningStart) >= timeToMinutes(normalized.morningEnd)) {
        throw new Error("Morning prasad window must end after it starts.");
    }
    if (timeToMinutes(normalized.eveningStart) >= timeToMinutes(normalized.eveningEnd)) {
        throw new Error("Evening prasad window must end after it starts.");
    }
}

export function getPrasadWindowOptions(config?: PrasadWindowConfig | null): PrasadWindowOption[] {
    const normalized = normalizePrasadWindowConfig(config);
    return [
        {
            value: BhogOfferingWindow.MORNING,
            label: `Morning (${formatTimeLabel(normalized.morningStart)} - ${formatTimeLabel(normalized.morningEnd)})`,
            start: normalized.morningStart,
            end: normalized.morningEnd,
        },
        {
            value: BhogOfferingWindow.EVENING,
            label: `Evening (${formatTimeLabel(normalized.eveningStart)} - ${formatTimeLabel(normalized.eveningEnd)})`,
            start: normalized.eveningStart,
            end: normalized.eveningEnd,
        },
    ];
}

export function getAvailablePrasadWindows(input: {
    selectedDate: Date;
    now?: Date;
    config?: PrasadWindowConfig | null;
    festivalStartDate: Date;
    festivalEndDate?: Date | null;
    status?: OrganizationStatus | "ACTIVE" | "ENDED";
}) {
    const now = input.now || new Date();
    if (isEndedStatus(input.status)) return [];
    if (!isDateWithinFestival(input.selectedDate, input.festivalStartDate, input.festivalEndDate)) return [];

    return getPrasadWindowOptions(input.config).filter((option) =>
        isPrasadWindowAvailable({
            selectedDate: input.selectedDate,
            window: option.value,
            now,
            config: input.config,
            festivalStartDate: input.festivalStartDate,
            festivalEndDate: input.festivalEndDate,
            status: input.status,
        })
    );
}

export function isPrasadWindowAvailable(input: {
    selectedDate: Date;
    window: BhogOfferingWindow;
    now?: Date;
    config?: PrasadWindowConfig | null;
    festivalStartDate: Date;
    festivalEndDate?: Date | null;
    status?: OrganizationStatus | "ACTIVE" | "ENDED";
}) {
    const now = input.now || new Date();
    if (isEndedStatus(input.status)) return false;
    if (!isDateWithinFestival(input.selectedDate, input.festivalStartDate, input.festivalEndDate)) return false;

    const options = getPrasadWindowOptions(input.config);
    const selected = options.find((option) => option.value === input.window);
    if (!selected) return false;

    const selectedDay = startOfLocalDay(input.selectedDate);
    const today = startOfLocalDay(now);
    if (selectedDay.getTime() < today.getTime()) return false;
    if (selectedDay.getTime() > today.getTime()) return true;

    const windowEnd = withTime(selectedDay, selected.end);
    return now.getTime() <= windowEnd.getTime();
}

export function parseDateInput(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

export function formatDateInput(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function getNextAvailablePrasadDate(input: {
    now?: Date;
    festivalStartDate: Date;
    festivalEndDate?: Date | null;
    config?: PrasadWindowConfig | null;
    status?: OrganizationStatus | "ACTIVE" | "ENDED";
}) {
    const now = input.now || new Date();
    const today = startOfLocalDay(now);
    const start = startOfLocalDay(input.festivalStartDate);
    let candidate = today.getTime() > start.getTime() ? today : start;

    for (let i = 0; i < 370; i++) {
        if (getAvailablePrasadWindows({ ...input, selectedDate: candidate, now }).length > 0) return candidate;
        candidate = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate() + 1);
    }

    return today;
}

export function formatOfferingWindow(window: BhogOfferingWindow, config?: PrasadWindowConfig | null) {
    return getPrasadWindowOptions(config).find((option) => option.value === window)?.label || window;
}

function isDateWithinFestival(date: Date, startDate: Date, endDate?: Date | null) {
    const day = startOfLocalDay(date).getTime();
    const start = startOfLocalDay(startDate).getTime();
    const end = endDate ? startOfLocalDay(endDate).getTime() : Number.POSITIVE_INFINITY;
    return day >= start && day <= end;
}

function startOfLocalDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function withTime(date: Date, time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}

function timeToMinutes(time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

function formatTimeLabel(time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${`${minutes}`.padStart(2, "0")} ${suffix}`;
}

function isEndedStatus(status: OrganizationStatus | "ACTIVE" | "ENDED" | undefined) {
    return String(status || "") === "ENDED";
}
