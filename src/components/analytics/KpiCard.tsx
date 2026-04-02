type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: "blue" | "green" | "red" | "orange" | "purple";
  "data-testid"?: string;
};

const COLOR_MAP = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-100" },
  green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-100" },
  red:    { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-100" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" },
};

export default function KpiCard({ title, value, subtitle, color = "blue", "data-testid": testId }: Props) {
  const c = COLOR_MAP[color];
  return (
    <div className={`${c.bg} border ${c.border} rounded-2xl p-5`} data-testid={testId}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <p className={`text-3xl font-bold ${c.text} leading-none`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-2">{subtitle}</p>}
    </div>
  );
}
