export const DEFAULT_PAGE_SIZE = 10;
export const COMPACT_PAGE_SIZE = 4;
export const MAX_PAGE_SIZE = 100;

export type DashboardSearchParams = Record<string, string | string[] | undefined>;

export type PageQuery = {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    category?: string;
    dateFrom?: Date;
    dateTo?: Date;
};

export type PaginatedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
};

export function parsePageQuery(searchParams?: DashboardSearchParams, options?: { defaultPageSize?: number }): PageQuery {
    const page = clampPositiveInt(first(searchParams?.page), 1);
    const pageSize = Math.min(
        clampPositiveInt(first(searchParams?.pageSize), options?.defaultPageSize || DEFAULT_PAGE_SIZE),
        MAX_PAGE_SIZE
    );

    return {
        page,
        pageSize,
        search: clean(first(searchParams?.q) || first(searchParams?.search)),
        status: clean(first(searchParams?.status)),
        category: clean(first(searchParams?.category)),
        dateFrom: parseDate(first(searchParams?.from) || first(searchParams?.dateFrom)),
        dateTo: endOfDay(parseDate(first(searchParams?.to) || first(searchParams?.dateTo))),
    };
}

export function paginate<T>(items: T[], totalItems: number, query: Pick<PageQuery, "page" | "pageSize">): PaginatedResult<T> {
    return {
        items,
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
    };
}

export function getPaginationArgs(query: Pick<PageQuery, "page" | "pageSize">) {
    return {
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
    };
}

export function buildPageHref(basePath: string, searchParams: DashboardSearchParams | undefined, page: number) {
    const params = new URLSearchParams();
    Object.entries(searchParams || {}).forEach(([key, value]) => {
        const current = first(value);
        if (current && key !== "page") params.set(key, current);
    });
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
}

function first(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | undefined) {
    const trimmed = value?.trim();
    return trimmed || undefined;
}

function clampPositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return parsed;
}

function parseDate(value: string | undefined) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function endOfDay(date: Date | undefined) {
    if (!date) return undefined;
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
}
