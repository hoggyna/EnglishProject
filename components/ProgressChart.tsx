"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import type { DailyProgressPoint } from "@/lib/types";

export default function ProgressChart({
  data,
}: {
  data: DailyProgressPoint[];
}) {
  const display = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={display} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
          <XAxis dataKey="label" fontSize={11} />
          <YAxis yAxisId="left" fontSize={11} allowDecimals={false} />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            fontSize={11}
            hide
          />
          <Tooltip />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="reviews"
            name="จำนวนที่ทบทวน"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            dataKey="accuracy"
            name="ความแม่นยำ (%)"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
