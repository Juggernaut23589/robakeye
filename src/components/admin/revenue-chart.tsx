"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RevenueChart({ data }: { data: { date: string; totalNaira: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B1E6D" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#1B1E6D" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
          tick={{ fontSize: 11, fill: "#6B7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `₦${v.toLocaleString()}`}
          tick={{ fontSize: 11, fill: "#6B7280" }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          formatter={(value) => [`₦${Number(value).toLocaleString()}`, "Revenue"]}
          labelFormatter={(d) => new Date(String(d)).toLocaleDateString("en-NG", { dateStyle: "medium" })}
        />
        <Area type="monotone" dataKey="totalNaira" stroke="#1B1E6D" strokeWidth={2} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
