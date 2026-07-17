import { OrganizationRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { hasPermission } from "./access-control";

describe("permissions", () => {
    it("allows treasurers to approve finance but blocks volunteers", () => {
        expect(hasPermission(OrganizationRole.TREASURER, "finance:approve")).toBe(true);
        expect(hasPermission(OrganizationRole.VOLUNTEER, "finance:approve")).toBe(false);
    });

    it("allows committee members to create finance records but not approve them", () => {
        expect(hasPermission(OrganizationRole.COMMITTEE_MEMBER, "finance:create")).toBe(true);
        expect(hasPermission(OrganizationRole.COMMITTEE_MEMBER, "finance:approve")).toBe(false);
    });
});
