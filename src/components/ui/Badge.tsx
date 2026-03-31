import { ReactNode } from "react";

type BadgeColor = "blue" | "green" | "yellow" | "red" | "gray" | "purple" | "orange" | "emerald";
type BadgeSize = "xs" | "sm";

const COLOR: Record<BadgeColor, string> = {
  blue:    "bg-blue-100 text-blue-700",
  green:   "bg-green-100 text-green-700",
  yellow:  "bg-yellow-100 text-yellow-700",
  red:     "bg-red-100 text-red-700",
  gray:    "bg-gray-100 text-gray-600",
  purple:  "bg-purple-100 text-purple-700",
  orange:  "bg-orange-100 text-orange-700",
  emerald: "bg-emerald-100 text-emerald-700",
};

const SIZE: Record<BadgeSize, string> = {
  xs: "text-xs px-2 py-0.5",
  sm: "text-xs px-2.5 py-1",
};

interface BadgeProps {
  color: BadgeColor;
  size?: BadgeSize;
  children: ReactNode;
  className?: string;
}

export function Badge({ color, size = "sm", children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full font-medium",
        COLOR[color],
        SIZE[size],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
