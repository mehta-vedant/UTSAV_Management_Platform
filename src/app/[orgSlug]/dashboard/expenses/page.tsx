import { resolveOrgContext } from "@/lib/org-context";
import { formatOrgDateTime } from "@/lib/date-time";
import { DashboardSearchParams, parsePageQuery } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/shared/EmptyState";
import { DashboardFilters } from "@/components/dashboard/shared/DashboardFilters";
import { PaginationControls } from "@/components/dashboard/shared/PaginationControls";
import AddExpenseModal from "@/components/dashboard/expenses/AddExpenseModal";
import EditExpenseModal from "@/components/dashboard/expenses/EditExpenseModal";
import ExpenseApprovalActions from "@/components/dashboard/expenses/ExpenseApprovalActions";
import { getPaginatedExpenses } from "@/modules/finance/expense.service";
import { ExpenseCategory, ExpenseStatus, OrganizationRole } from "@prisma/client";
import { AlertCircle, CheckCircle2, Landmark, Receipt, ShoppingBag, XCircle } from "lucide-react";

export default async function ExpensesPage({
    params,
    searchParams,
}: {
    params: { orgSlug: string };
    searchParams?: DashboardSearchParams;
}) {
    const { organization, member, isFestival } = await resolveOrgContext(params.orgSlug);
    const query = parsePageQuery(searchParams);
    const expenses = await getPaginatedExpenses(organization.id, query);

    const isTreasurer = member.role === OrganizationRole.TREASURER || member.role === OrganizationRole.ADMIN;
    const canAdd = ([OrganizationRole.ADMIN, OrganizationRole.COMMITTEE_MEMBER, OrganizationRole.TREASURER] as string[]).includes(member.role);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-saffron-500" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Financial Ledger</span>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 sm:text-4xl sm:tracking-tighter">Expense Requests</h1>
                    <p className="mt-1 font-medium text-slate-500">Track and approve all expenditures for the pavilion.</p>
                </div>

                {canAdd && <AddExpenseModal organizationId={organization.id} isFestival={isFestival} />}
            </div>

            <DashboardFilters
                searchPlaceholder="Search expenses"
                current={query}
                statusOptions={Object.values(ExpenseStatus).map((status) => ({ value: status, label: status }))}
                categoryOptions={Object.values(ExpenseCategory).map((category) => ({
                    value: category,
                    label: category.replace("_", " "),
                }))}
            />

            <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white text-sm shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Expense Detail</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Operational Context</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Requested By</th>
                                {isTreasurer && <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {expenses.items.map((expense) => (
                                <tr key={expense.id} className="group transition-colors hover:bg-slate-50/50">
                                    <td className="px-8 py-6">
                                        <div>
                                            <div className="font-bold uppercase tracking-tight text-slate-900">{expense.title}</div>
                                            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Requested {formatOrgDateTime(expense.requestedAt, organization.timezone)}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="w-fit rounded-lg bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-slate-600">
                                            {expense.category.replace("_", " ")}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {expense.event ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
                                                    <ShoppingBag className="h-3 w-3" />
                                                    {expense.event.title}
                                                </div>
                                                <div className="ml-4 text-[8px] font-bold uppercase tracking-widest text-slate-400">Event Scoped</div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <Landmark className="h-3 w-3" />
                                                Organization
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 font-black text-slate-900">Rs {Number(expense.amount).toLocaleString()}</td>
                                    <td className="px-8 py-6">
                                        <StatusBadge status={expense.status} />
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-medium text-slate-500">{expense.addedBy?.user?.name || "System"}</div>
                                    </td>
                                    {isTreasurer && (
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <EditExpenseModal
                                                    organizationId={organization.id}
                                                    isFestival={isFestival}
                                                    expense={{
                                                        ...expense,
                                                        amount: Number(expense.amount),
                                                    }}
                                                />
                                                <ExpenseApprovalActions expenseId={expense.id} organizationId={organization.id} status={expense.status} />
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {expenses.items.length === 0 ? (
                    <EmptyState title="No expenses found" message="Try a different status, category, date range, or search term." />
                ) : (
                    <PaginationControls
                        basePath={`/${params.orgSlug}/dashboard/expenses`}
                        searchParams={searchParams}
                        page={expenses.page}
                        pageSize={expenses.pageSize}
                        totalItems={expenses.totalItems}
                        totalPages={expenses.totalPages}
                    />
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: ExpenseStatus }) {
    const config = {
        [ExpenseStatus.PENDING]: { icon: AlertCircle, text: "Pending", class: "bg-amber-50 text-amber-600 border-amber-100" },
        [ExpenseStatus.APPROVED]: { icon: CheckCircle2, text: "Approved", class: "bg-green-50 text-green-600 border-green-100" },
        [ExpenseStatus.REJECTED]: { icon: XCircle, text: "Rejected", class: "bg-red-50 text-red-600 border-red-100" },
    }[status];

    const Icon = config.icon;

    return (
        <div className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest", config.class)}>
            <Icon className="h-3.5 w-3.5" />
            {config.text}
        </div>
    );
}
