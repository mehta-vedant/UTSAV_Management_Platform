import { OrganizationType } from "@prisma/client";
import { NotFoundAppError } from "./errors";

export type OrganizationMode = Pick<{ type: OrganizationType }, "type">;

export function isFestivalOrganization(organization: OrganizationMode | null | undefined) {
    return organization?.type === OrganizationType.FESTIVAL;
}

export function assertFestivalMode(organization: OrganizationMode | null | undefined) {
    if (!isFestivalOrganization(organization)) {
        throw new NotFoundAppError("This public Festival page is not available for Clubs.");
    }
}
