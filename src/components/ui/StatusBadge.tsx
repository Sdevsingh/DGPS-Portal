import { Badge } from "./Badge";

const JOB_STATUS_COLOR: Record<string, Parameters<typeof Badge>[0]["color"]> = {
  new:         "blue",
  ready:       "purple",
  in_progress: "yellow",
  completed:   "green",
  invoiced:    "orange",
  paid:        "emerald",
};

const QUOTE_STATUS_COLOR: Record<string, Parameters<typeof Badge>[0]["color"]> = {
  pending:  "gray",
  sent:     "blue",
  approved: "green",
  rejected: "red",
};

const PAYMENT_STATUS_COLOR: Record<string, Parameters<typeof Badge>[0]["color"]> = {
  unpaid:   "gray",
  invoiced: "orange",
  paid:     "emerald",
};

const PRIORITY_COLOR: Record<string, Parameters<typeof Badge>[0]["color"]> = {
  high:   "red",
  medium: "yellow",
  low:    "gray",
};

type StatusType = "job" | "quote" | "payment" | "priority";

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  size?: "xs" | "sm";
}

export function StatusBadge({ status, type = "job", size = "sm" }: StatusBadgeProps) {
  const colorMap =
    type === "quote"    ? QUOTE_STATUS_COLOR :
    type === "payment"  ? PAYMENT_STATUS_COLOR :
    type === "priority" ? PRIORITY_COLOR :
    JOB_STATUS_COLOR;

  const color = colorMap[status] ?? "gray";
  const label = status.replace(/_/g, " ");

  return (
    <Badge color={color} size={size}>
      {label}
    </Badge>
  );
}
