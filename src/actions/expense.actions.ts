"use server";

import { z } from "zod";
import { ExpenseService } from "@/modules/finance/expense.service";
import { ExpenseCategory, ExpenseStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { actionFailure, actionSuccess } from "@/lib/action-response";

const CreateExpenseSchema = z.object({
    organizationId: z.string(),
    title: z.string().min(1, "Title is required"),
    amount: z.number().gt(0, "Amount must be greater than zero"),
    category: z.nativeEnum(ExpenseCategory),
    requestedAt: z.string().datetime("Expense date and time are required."),
    notes: z.string().optional(),
    eventId: z.string().optional(),
});

export async function createExpenseAction(data: z.infer<typeof CreateExpenseSchema>) {
    try {
        const validated = CreateExpenseSchema.parse(data);
        await ExpenseService.createExpense(validated.organizationId, {
            ...validated,
            requestedAt: new Date(validated.requestedAt),
        });

        revalidatePath(`/[orgSlug]/dashboard/expenses`, "page");
        revalidatePath(`/`, "layout"); // Update public dashboard totals if needed
        return actionSuccess();
    } catch (error: any) {
        return actionFailure(error, "Failed to record expense.");
    }
}

export async function approveExpenseAction(organizationId: string, expenseId: string) {
    try {
        await ExpenseService.approveExpense(organizationId, expenseId);
        revalidatePath(`/[orgSlug]/dashboard/expenses`, "page");
        return actionSuccess();
    } catch (error: any) {
        return actionFailure(error, "Failed to approve expense.");
    }
}

export async function rejectExpenseAction(organizationId: string, expenseId: string) {
    try {
        await ExpenseService.rejectExpense(organizationId, expenseId);
        revalidatePath(`/[orgSlug]/dashboard/expenses`, "page");
        return actionSuccess();
    } catch (error: any) {
        return actionFailure(error, "Failed to reject expense.");
    }
}
const UpdateExpenseSchema = z.object({
    organizationId: z.string(),
    expenseId: z.string(),
    title: z.string().min(1).optional(),
    amount: z.number().gt(0).optional(),
    category: z.nativeEnum(ExpenseCategory).optional(),
    notes: z.string().optional(),
    eventId: z.string().optional(),
});

export async function updateExpenseAction(data: z.infer<typeof UpdateExpenseSchema>) {
    try {
        const validated = UpdateExpenseSchema.parse(data);
        const { organizationId, expenseId, ...updateData } = validated;
        await ExpenseService.updateExpense(organizationId, expenseId, updateData);

        revalidatePath(`/[orgSlug]/dashboard/expenses`, "page");
        revalidatePath(`/[orgSlug]/dashboard/events/[eventId]`, "layout");
        return actionSuccess();
    } catch (error: any) {
        return actionFailure(error, "Failed to update expense.");
    }
}

export async function archiveExpenseAction(organizationId: string, expenseId: string) {
    try {
        await ExpenseService.archiveExpense(organizationId, expenseId);
        revalidatePath(`/[orgSlug]/dashboard/expenses`, "page");
        revalidatePath(`/[orgSlug]/dashboard/events/[eventId]`, "layout");
        return actionSuccess();
    } catch (error: any) {
        return actionFailure(error, "Failed to archive expense.");
    }
}
