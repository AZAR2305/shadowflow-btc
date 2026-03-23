"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { step: 1, score: 24 },
  { step: 2, score: 41 },
  { step: 3, score: 35 },
  { step: 4, score: 56 },
  { step: 5, score: 44 },
  { step: 6, score: 62 },
];

export function ExecutionTimeline() {
  return (
    <div className="h-[280px] rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 font-heading text-lg font-bold">Execution Timeline</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid stroke="#1E1E32" strokeDasharray="4 4" />
          <XAxis dataKey="step" stroke="#4A4A6A" />
          <YAxis stroke="#4A4A6A" />
          <Tooltip formatter={() => "Value hidden for privacy"} />
          <Area type="monotone" dataKey="score" stroke="#00FF88" fill="#00FF8833" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
