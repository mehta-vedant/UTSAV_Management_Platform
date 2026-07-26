import { getTenantPrisma, validateAccess } from "@/lib/access-control";
import { OrganizationRole, TaskPriority, TaskStatus } from "@prisma/client";

export interface CreateTaskInput {
    title: string;
    description?: string;
    assignedToId: string;
    priority: TaskPriority;
    dueDate?: Date;
    eventId?: string;
}

export async function createTask(organizationId: string, input: CreateTaskInput) {
    await validateAccess(organizationId, [
        OrganizationRole.ADMIN,
        OrganizationRole.COMMITTEE_MEMBER,
    ]);

    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.volunteerTask.create({
        data: {
            organizationId,
            title: input.title,
            description: input.description,
            assignedToId: input.assignedToId,
            priority: input.priority,
            dueDate: input.dueDate,
            eventId: input.eventId,
            status: TaskStatus.PENDING,
        },
        include: {
            assignedTo: {
                select: {
                    email: true,
                    user: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        }
    });
}

export async function getAllTasks(organizationId: string) {
    await validateAccess(organizationId, [
        OrganizationRole.ADMIN,
        OrganizationRole.COMMITTEE_MEMBER,
        OrganizationRole.TREASURER,
    ]);

    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.volunteerTask.findMany({
        where: { isArchived: false },
        orderBy: [
            { priority: "desc" },
            { createdAt: "desc" }
        ],
        include: {
            assignedTo: {
                select: {
                    id: true,
                    email: true,
                    user: {
                        select: {
                            name: true
                        }
                    }
                }
            },
            event: {
                select: {
                    title: true
                }
            }
        }
    });
}

export async function getMyTasks(organizationId: string) {
    const { member } = await validateAccess(organizationId);
    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.volunteerTask.findMany({
        where: { assignedToId: member.id, isArchived: false },
        orderBy: { dueDate: "asc" },
        include: {
            assignedTo: {
                include: {
                    user: {
                        select: { name: true, email: true, image: true }
                    }
                }
            },
            event: {
                select: { title: true }
            }
        }
    });
}

export async function updateTask(organizationId: string, taskId: string, input: Partial<CreateTaskInput>) {
    await validateAccess(organizationId, [
        OrganizationRole.ADMIN,
        OrganizationRole.COMMITTEE_MEMBER,
    ]);

    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.volunteerTask.update({
        where: { id: taskId },
        data: {
            title: input.title,
            description: input.description,
            assignedToId: input.assignedToId,
            priority: input.priority,
            dueDate: input.dueDate,
            eventId: input.eventId,
        }
    });
}

export async function updateTaskStatus(organizationId: string, taskId: string, status: TaskStatus) {
    const { member } = await validateAccess(organizationId);
    const tenantPrisma = getTenantPrisma(organizationId);

    const task = await tenantPrisma.volunteerTask.findUnique({
        where: { id: taskId }
    });

    if (!task) throw new Error("Task not found");

    if (member.role === OrganizationRole.VOLUNTEER && task.assignedToId !== member.id) {
        throw new Error("Unauthorized: You can only update your own tasks");
    }

    return await tenantPrisma.volunteerTask.update({
        where: { id: taskId },
        data: { status }
    });
}

export async function deleteTask(organizationId: string, taskId: string) {
    await validateAccess(organizationId, [
        OrganizationRole.ADMIN,
        OrganizationRole.COMMITTEE_MEMBER,
    ]);

    const tenantPrisma = getTenantPrisma(organizationId);

    return await tenantPrisma.volunteerTask.update({
        where: { id: taskId },
        data: { isArchived: true }
    });
}

export async function getVolunteerWorkload(organizationId: string) {
    await validateAccess(organizationId, [
        OrganizationRole.ADMIN,
        OrganizationRole.COMMITTEE_MEMBER,
        OrganizationRole.TREASURER,
    ]);

    const tenantPrisma = getTenantPrisma(organizationId);

    const volunteers = await tenantPrisma.organizationMember.findMany({
        where: {
            role: { in: [OrganizationRole.VOLUNTEER, OrganizationRole.TREASURER, OrganizationRole.COMMITTEE_MEMBER] },
            isArchived: false,
        },
        include: {
            user: {
                select: {
                    name: true,
                    image: true,
                    phone: true
                }
            },
            _count: {
                select: {
                    assignedTasks: {
                        where: {
                            status: { not: TaskStatus.COMPLETED },
                            isArchived: false
                        }
                    }
                }
            }
        }
    });

    return volunteers.map(v => ({
        id: v.id,
        name: v.user?.name || v.email.split('@')[0],
        email: v.email,
        role: v.role,
        activeTasks: v._count.assignedTasks,
        phone: v.user?.phone,
    }));
}
