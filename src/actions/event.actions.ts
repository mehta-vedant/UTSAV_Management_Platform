"use server";

import { revalidatePath } from "next/cache";
import { createEvent, updateEvent, deleteEvent, assignMemberToEvent, removeMemberFromEvent, CreateEventInput, UpdateEventInput } from "@/modules/events/event.service";

/**
 * Action to create a new event
 */
export async function createEventAction(organizationId: string, orgSlug: string, input: CreateEventInput) {
    try {
        const event = await createEvent(organizationId, input);
        revalidatePath(`/${orgSlug}/dashboard/events`);
        revalidatePath(`/${orgSlug}/transparency`); // Update public schedule
        return { success: true, eventId: event.id };
    } catch (error: any) {
        console.error("Failed to create event:", error);
        return { error: error.message || "Failed to create event" };
    }
}

/**
 * Action to update an event
 */
export async function updateEventAction(
    organizationId: string,
    orgSlug: string,
    eventId: string,
    input: UpdateEventInput
) {
    try {
        await updateEvent(organizationId, eventId, input);
        revalidatePath(`/${orgSlug}/dashboard/events`);
        revalidatePath(`/${orgSlug}/transparency`);
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update event:", error);
        return { error: error.message || "Failed to update event" };
    }
}

/**
 * Action to delete an event
 */
export async function deleteEventAction(organizationId: string, orgSlug: string, eventId: string) {
    try {
        await deleteEvent(organizationId, eventId);
        revalidatePath(`/${orgSlug}/dashboard/events`);
        revalidatePath(`/${orgSlug}/transparency`);
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete event:", error);
        return { error: error.message || "Failed to delete event" };
    }
}

/**
 * Action to assign a member to an event
 */
export async function assignMemberToEventAction(organizationId: string, orgSlug: string, eventId: string, memberId: string) {
    try {
        await assignMemberToEvent(organizationId, eventId, memberId);
        revalidatePath(`/${orgSlug}/dashboard/events/${eventId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Failed to assign member:", error);
        return { error: error.message || "Failed to assign member" };
    }
}

/**
 * Action to remove a member from an event
 */
export async function removeMemberFromEventAction(organizationId: string, orgSlug: string, eventId: string, memberId: string) {
    try {
        await removeMemberFromEvent(organizationId, eventId, memberId);
        revalidatePath(`/${orgSlug}/dashboard/events/${eventId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Failed to remove member:", error);
        return { error: error.message || "Failed to remove member" };
    }
}
