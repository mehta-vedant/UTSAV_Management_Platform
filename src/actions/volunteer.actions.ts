"use server";

import { createTask, updateTask, updateTaskStatus, deleteTask, CreateTaskInput } from "@/modules/tasks/task.service";
import { TaskStatus } from "@prisma/client";
import { withActionNoReturn } from "@/lib/action";

export async function createTaskAction(organizationId: string, orgSlug: string, input: CreateTaskInput) {
    return withActionNoReturn(async () => {
        await createTask(organizationId, input);
    }, { paths: [{ path: `/${orgSlug}/dashboard/volunteers` }] });
}

export async function updateTaskAction(
    organizationId: string,
    orgSlug: string,
    taskId: string,
    input: Partial<CreateTaskInput>
) {
    return withActionNoReturn(async () => {
        await updateTask(organizationId, taskId, input);
    }, { paths: [{ path: `/${orgSlug}/dashboard/volunteers` }, { path: `/${orgSlug}/dashboard/events/[eventId]`, type: "layout" }] });
}

export async function updateTaskStatusAction(
    organizationId: string,
    orgSlug: string,
    taskId: string,
    status: TaskStatus
) {
    return withActionNoReturn(async () => {
        await updateTaskStatus(organizationId, taskId, status);
    }, { paths: [{ path: `/${orgSlug}/dashboard/volunteers` }] });
}

export async function deleteTaskAction(organizationId: string, orgSlug: string, taskId: string) {
    return withActionNoReturn(async () => {
        await deleteTask(organizationId, taskId);
    }, { paths: [{ path: `/${orgSlug}/dashboard/volunteers` }] });
}
