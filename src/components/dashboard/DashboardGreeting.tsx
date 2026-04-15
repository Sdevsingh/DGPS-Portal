"use client";

export default function DashboardGreeting({ name }: { name: string }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">
        {dateStr}
      </p>
      <h1 className="text-2xl font-bold text-gray-900">
        {greeting}, {name}
      </h1>
    </div>
  );
}
