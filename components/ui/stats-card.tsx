import {
  ArrowRightLeft,
  Users,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  "arrows-right-left": <ArrowRightLeft className="w-5 h-5 text-slate-400" />,
  users: <Users className="w-5 h-5 text-slate-400" />,
  "alert-triangle": <AlertTriangle className="w-5 h-5 text-amber-500" />,
  package: <Package className="w-5 h-5 text-slate-400" />,
};

interface StatsCardProps {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: string;
}

export default function StatsCard({ label, value, trend, trendUp, icon }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </span>
        {iconMap[icon]}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-slate-900">{value}</p>
      {trend && (
        <div
          className={`flex items-center gap-1 mt-2 text-sm ${
            trendUp === true
              ? "text-emerald-600"
              : trendUp === false
                ? "text-red-600"
                : "text-slate-500"
          }`}
        >
          {trendUp === true && <TrendingUp className="w-3.5 h-3.5" />}
          {trendUp === false && <TrendingDown className="w-3.5 h-3.5" />}
          {trend}
        </div>
      )}
    </div>
  );
}
