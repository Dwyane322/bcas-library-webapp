"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BarChartCardProps {
  title: string;
  data: Record<string, unknown>[];
  dataKey: string;
  xAxisKey: string;
  color?: string;
}

export default function BarChartCard({
  title,
  data,
  dataKey,
  xAxisKey,
  color = "#047857",
}: BarChartCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">{title}</h3>
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
              }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
