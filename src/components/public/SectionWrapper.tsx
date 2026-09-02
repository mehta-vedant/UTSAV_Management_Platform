import { cn } from "@/lib/utils";

interface SectionWrapperProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export default function SectionWrapper({ children, className }: SectionWrapperProps) {
    return <div className={cn("w-full", className)}>{children}</div>;
}
