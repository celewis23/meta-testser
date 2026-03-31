import { TestStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TestStatus | string }) {
  const color =
    status === TestStatus.PASSED
      ? "bg-success/15 text-success"
      : status === TestStatus.FAILED
        ? "bg-destructive/15 text-destructive"
        : status === TestStatus.BLOCKED
          ? "bg-warning/15 text-warning"
          : "bg-muted text-muted-foreground";
  return <Badge className={color}>{status}</Badge>;
}
