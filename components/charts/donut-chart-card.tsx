"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

interface DonutChartCardProps {
  title: string;
  data: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
}

export default function DonutChartCard({
  title,
  data,
  centerLabel = "Total",
  centerValue,
}: DonutChartCardProps) {
  const total = centerValue ?? String(data.reduce((sum, d) => sum + d.value, 0));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
        <button className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
          View All
        </button>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "13px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">{total}</span>
            <span className="text-xs text-slate-500">{centerLabel}</span>
          </div>
        </div>
        <div className="space-y-3 w-full sm:w-auto">
          {data.map((slice) => (
            <div key={slice.name} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-sm text-slate-600">{slice.name}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{slice.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
