// The lead-status pill. Amber for PENDING, green for REACHED_OUT — distinguishable at a glance.

import type { LeadState } from "@/lib/api";

type StatusBadgeProps = {
  state: LeadState;
  size?: "sm" | "md";
  pendingLabel?: string;
};

export function StatusBadge({ state, size = "sm", pendingLabel = "Pending" }: StatusBadgeProps) {
  const isPending = state === "PENDING";
  const height = size === "md" ? 28 : 26;
  const fontSize = size === "md" ? 13 : 12.5;
  const padding = size === "md" ? "0 12px 0 10px" : "0 11px 0 9px";

  const colors = isPending
    ? "bg-pending-bg text-pending-ink"
    : "bg-reached-bg text-reached-ink";
  const dot = isPending ? "bg-pending-dot" : "bg-reached-dot";
  const label = isPending ? pendingLabel : "Reached out";

  return (
    <span
      className={`inline-flex items-center gap-[7px] rounded-full font-semibold ${colors}`}
      style={{ height, fontSize, padding }}
    >
      <span className={`h-[7px] w-[7px] rounded-full ${dot}`} />
      {label}
    </span>
  );
}
