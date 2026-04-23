"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: "blue" | "green" | "red" | "orange" | "purple";
  icon?: React.ReactNode;
  "data-testid"?: string;
};

const COLOR_MAP = {
  blue:   { icon: "bg-blue-50 text-blue-600",        accent: "bg-blue-600",    text: "text-blue-600"    },
  green:  { icon: "bg-emerald-50 text-emerald-600",  accent: "bg-emerald-500", text: "text-emerald-600" },
  red:    { icon: "bg-red-50 text-red-500",           accent: "bg-red-500",     text: "text-red-500"     },
  orange: { icon: "bg-amber-50 text-amber-600",       accent: "bg-amber-500",   text: "text-amber-600"   },
  purple: { icon: "bg-purple-50 text-purple-600",     accent: "bg-purple-500",  text: "text-purple-600"  },
};

function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v).toLocaleString());
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 1.2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ease: [0.25, 0.46, 0.45, 0.94] as any,
    });
    return controls.stop;
  }, [value, motionVal]);

  useEffect(() => {
    return rounded.on("change", (v) => {
      if (displayRef.current) displayRef.current.textContent = v;
    });
  }, [rounded]);

  return <span ref={displayRef}>0</span>;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  color = "blue",
  icon,
  "data-testid": testId,
}: Props) {
  const c = COLOR_MAP[color];
  const isNumeric = typeof value === "number";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden"
      data-testid={testId}
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.accent}`} />

      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider leading-none pt-1">
          {title}
        </p>
        {icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
            {icon}
          </div>
        )}
      </div>

      <p className={`text-3xl font-bold leading-none ${c.text}`}>
        {isNumeric ? <AnimatedNumber value={value as number} /> : value}
      </p>

      {subtitle && (
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">{subtitle}</p>
      )}
    </motion.div>
  );
}
