import { Inbox } from "lucide-react";

export function EmptyState({ title, message }: { title: string; message: string }) {
    return (
        <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Inbox className="h-5 w-5" />
            </div>
            <div className="text-sm font-black uppercase tracking-widest text-slate-700">{title}</div>
            <p className="mt-2 max-w-md text-sm font-medium text-slate-400">{message}</p>
        </div>
    );
}
