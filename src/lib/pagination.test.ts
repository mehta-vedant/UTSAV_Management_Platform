import { describe, expect, it } from "vitest";
import { MAX_PAGE_SIZE, buildPageHref, getPaginationArgs, paginate, parsePageQuery } from "./pagination";

describe("pagination helpers", () => {
    it("normalizes invalid page values and caps page size", () => {
        const query = parsePageQuery({
            page: "0",
            pageSize: String(MAX_PAGE_SIZE + 50),
            q: "  donation  ",
            status: "PENDING",
        });

        expect(query.page).toBe(1);
        expect(query.pageSize).toBe(MAX_PAGE_SIZE);
        expect(query.search).toBe("donation");
        expect(query.status).toBe("PENDING");
    });

    it("calculates skip and take for prisma queries", () => {
        expect(getPaginationArgs({ page: 3, pageSize: 10 })).toEqual({ skip: 20, take: 10 });
    });

    it("returns total pages with a minimum of one", () => {
        expect(paginate([], 0, { page: 1, pageSize: 10 }).totalPages).toBe(1);
        expect(paginate([1, 2], 21, { page: 2, pageSize: 10 }).totalPages).toBe(3);
    });

    it("keeps filters when building page hrefs", () => {
        expect(buildPageHref("/demo", { q: "bhog", status: "PENDING", page: "2" }, 3)).toBe("/demo?q=bhog&status=PENDING&page=3");
        expect(buildPageHref("/demo", { q: "bhog" }, 1)).toBe("/demo?q=bhog");
    });
});
