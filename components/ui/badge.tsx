const statusStyles: Record<string, string> = {
  Completed: "bg-emerald-100 text-emerald-700",
  Active: "bg-emerald-100 text-emerald-700",
  "Pending Pickup": "bg-amber-100 text-amber-700",
  Overdue: "bg-red-100 text-red-700",
  Available: "bg-emerald-100 text-emerald-700",
  "All Copies Out": "bg-red-100 text-red-700",
  Limited: "bg-amber-100 text-amber-700",
};

interface BadgeProps {
  label: string;
}

export default function Badge({ label }: BadgeProps) {
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${
        statusStyles[label] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}
