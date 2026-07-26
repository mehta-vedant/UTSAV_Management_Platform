"use server";

import { createEvent, updateEvent, deleteEvent, assignMemberToEvent, removeMemberFromEvent, CreateEventInput, UpdateEventInput } from "@/modules/events/event.service";
import { withAction, withActionNoReturn } from "@/lib/action";

export async function createEventAction(organizationId: string, orgSlug: string, input: CreateEventInput) {
    return withAction(async () => {
        const event = await createEvent(organizationId, input);
        return { eventId: event.id };
    }, { paths: [{ path: `/${orgSlug}/dashboard/events` }, { path: `/${orgSlug}/transparency` }] });
}

export async function updateEventAction(
    organizationId: string,
    orgSlug: string,
    eventId: string,
    input: UpdateEventInput
) {
    return withActionNoReturn(async () => {
        await updateEvent(organizationId, eventId, input);
    }, { paths: [{ path: `/${orgSlug}/dashboard/events` }, { path: `/${orgSlug}/transparency` }] });
}

export async function deleteEventAction(organizationId: string, orgSlug: string, eventId: string) {
    return withActionNoReturn(async () => {
        await deleteEvent(organizationId, eventId);
    }, { paths: [{ path: `/${orgSlug}/dashboard/events` }, { path: `/${orgSlug}/transparency` }] });
}

export async function assignMemberToEventAction(organizationId: string, orgSlug: string, eventId: string, memberId: string) {
    return withActionNoReturn(async () => {
        await assignMemberToEvent(organizationId, eventId, memberId);
    }, { paths: [{ path: `/${orgSlug}/dashboard/events/${eventId}` }] });
}

export async function removeMemberFromEventAction(organizationId: string, orgSlug: string, eventId: string, memberId: string) {
    return withActionNoReturn(async () => {
        await removeMemberFromEvent(organizationId, eventId, memberId);
    }, { paths: [{ path: `/${orgSlug}/dashboard/events/${eventId}` }] });
}
