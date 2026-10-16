"use server";

import { z } from "zod";
import { withAction } from "@/lib/action";
import { explainBudgetHealth } from "@/modules/finance/budget-health.service";

export async function explainBudgetHealthAction(organizationId: string) {
    return withAction(() => explainBudgetHealth(z.string().min(1).parse(organizationId)));
}
