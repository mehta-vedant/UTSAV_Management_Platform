"use server";

import { revalidatePath } from "next/cache";
import { ActionResult, actionSuccess, actionFailure } from "./action-response";

type RevalidatePath = { path: string; type?: "page" | "layout" };

interface WithActionOptions {
    paths?: RevalidatePath[];
}

export async function withAction<T>(
    handler: () => Promise<T>,
    options: WithActionOptions = {}
): Promise<ActionResult<T>> {
    try {
        const result = await handler();
        if (options.paths) {
            for (const p of options.paths) {
                revalidatePath(p.path, p.type);
            }
        }
        return actionSuccess(result);
    } catch (error) {
        return actionFailure(error);
    }
}

export async function withActionNoReturn(
    handler: () => Promise<void>,
    options: WithActionOptions = {}
): Promise<ActionResult<undefined>> {
    try {
        await handler();
        if (options.paths) {
            for (const p of options.paths) {
                revalidatePath(p.path, p.type);
            }
        }
        return actionSuccess();
    } catch (error) {
        return actionFailure(error);
    }
}
