import { OrganizationType } from "@prisma/client";
import { NotFoundAppError } from "./errors";

export type OrganizationMode = Pick<{ type: OrganizationType }, "type">;

export function isFestivalOrganization(organization: OrganizationMode | null | undefined) {
    return organization?.type === OrganizationType.FESTIVAL;
}

export function isClubOrganization(organization: OrganizationMode | null | undefined) {
    return organization?.type === OrganizationType.CLUB;
}

export function assertFestivalMode(organization: OrganizationMode | null | undefined) {
    if (!isFestivalOrganization(organization)) {
        throw new NotFoundAppError("This public Festival page is not available for Clubs.");
    }
}

export function assertClubMode(organization: OrganizationMode | null | undefined) {
    if (!isClubOrganization(organization)) {
        throw new NotFoundAppError("This Club page is not available for Festivals.");
    }
}
