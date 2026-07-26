"use server";

import { z } from "zod";
import { createExpense, approveExpense, rejectExpense, updateExpense, archiveExpense } from "@/modules/finance/expense.service";
import { ExpenseCategory, ExpenseStatus } from "@prisma/client";
import { withActionNoReturn } from "@/lib/action";

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
    return withActionNoReturn(async () => {
        const validated = CreateExpenseSchema.parse(data);
        await createExpense(validated.organizationId, {
            ...validated,
            requestedAt: new Date(validated.requestedAt),
        });
    }, { paths: [{ path: "/[orgSlug]/dashboard/expenses", type: "page" }, { path: "/", type: "layout" }] });
}

export async function approveExpenseAction(organizationId: string, expenseId: string) {
    return withActionNoReturn(async () => {
        await approveExpense(organizationId, expenseId);
    }, { paths: [{ path: "/[orgSlug]/dashboard/expenses", type: "page" }] });
}

export async function rejectExpenseAction(organizationId: string, expenseId: string) {
    return withActionNoReturn(async () => {
        await rejectExpense(organizationId, expenseId);
    }, { paths: [{ path: "/[orgSlug]/dashboard/expenses", type: "page" }] });
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
    return withActionNoReturn(async () => {
        const validated = UpdateExpenseSchema.parse(data);
        const { organizationId, expenseId, ...updateData } = validated;
        await updateExpense(organizationId, expenseId, updateData);
    }, { paths: [{ path: "/[orgSlug]/dashboard/expenses", type: "page" }, { path: "/[orgSlug]/dashboard/events/[eventId]", type: "layout" }] });
}

export async function archiveExpenseAction(organizationId: string, expenseId: string) {
    return withActionNoReturn(async () => {
        await archiveExpense(organizationId, expenseId);
    }, { paths: [{ path: "/[orgSlug]/dashboard/expenses", type: "page" }, { path: "/[orgSlug]/dashboard/events/[eventId]", type: "layout" }] });
}
