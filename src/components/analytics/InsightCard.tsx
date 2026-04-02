type Props = {
  title: string;
  value: string | number;
  description: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
};

export default function InsightCard({ title, value, description, icon, trend }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      {icon && <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-gray-500">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{title}</p>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <span className={`text-xs font-medium pb-0.5 ${trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-gray-400"}`}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
}
