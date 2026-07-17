import type { Priority } from "@/types";
import { cn } from "@/lib/cn";

const config: Record<Priority, { label: string; className: string }> = {
  low: { label: "Baixa", className: "cv-badge-muted" },
  normal: { label: "Normal", className: "cv-badge-blue" },
  high: { label: "Alta", className: "cv-badge-orange" },
  urgent: { label: "Urgente", className: "cv-badge-red animate-pulse" }
};

type PriorityBadgeProps = {
  priority: Priority;
  className?: string;
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const cfg = config[priority];
  return (
    <span
      className={cn(
        "cv-badge",
        cfg.className,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}
