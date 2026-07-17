const DEFAULT_TIMEZONE = "Asia/Kolkata";

export function getOrganizationTimezone(timezone?: string | null) {
    return timezone || DEFAULT_TIMEZONE;
}

export function formatOrgDate(date: Date | string, timezone?: string | null) {
    return formatter(timezone, { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

export function formatOrgTime(date: Date | string, timezone?: string | null) {
    return formatter(timezone, { hour: "numeric", minute: "2-digit" }).format(new Date(date));
}

export function formatOrgDateTime(date: Date | string, timezone?: string | null) {
    return formatter(timezone, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(date));
}

function formatter(timezone: string | null | undefined, options: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: getOrganizationTimezone(timezone),
        ...options,
    });
}
