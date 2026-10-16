"use server";

import { z } from "zod";
import { createExpense, approveExpense, rejectExpense, updateExpense, archiveExpense } from "@/modules/finance/expense.service";
import { ExpenseCategory, ExpenseStatus, PaymentMode } from "@prisma/client";
import { withActionNoReturn } from "@/lib/action";
import { runIdempotent } from "@/lib/idempotency";

const CreateExpenseSchema = z.object({
    organizationId: z.string(),
    title: z.string().min(1, "Title is required"),
    amount: z.number().gt(0, "Amount must be greater than zero"),
    category: z.nativeEnum(ExpenseCategory),
    paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
    requestedAt: z.string().datetime("Expense date and time are required."),
    notes: z.string().optional(),
    eventId: z.string().optional(),
    idempotencyKey: z.string().uuid(),
});

export async function createExpenseAction(data: z.infer<typeof CreateExpenseSchema>) {
    return withActionNoReturn(async () => {
        const validated = CreateExpenseSchema.parse(data);
        const { idempotencyKey, ...expense } = validated;
        await runIdempotent({ organizationId: validated.organizationId, key: idempotencyKey, operation: "create-expense", payload: expense, execute: () => createExpense(validated.organizationId, {
            ...expense,
            requestedAt: new Date(expense.requestedAt),
        }) });
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
    paymentMode: z.nativeEnum(PaymentMode).optional(),
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
