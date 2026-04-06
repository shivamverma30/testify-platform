"use client";

import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalyticsChartsProps = {
  scoreTrend: Array<{ label: string; score: number }>;
  subjectAccuracy: Array<{ subject: string; value: number }>;
};

const chartColors = ["#4f46e5", "#06b6d4", "#34d399", "#f59e0b"];

export function AnalyticsCharts({ scoreTrend, subjectAccuracy }: AnalyticsChartsProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="glass-card rounded-2xl p-5">
        <h3 className="font-display text-lg text-white">Score Trend</h3>
        <p className="mt-1 text-sm text-slate-300">Last mock tests performance trajectory</p>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreTrend}>
              <XAxis dataKey="label" stroke="#b8c5d8" />
              <YAxis stroke="#b8c5d8" />
              <Tooltip
                contentStyle={{
                  background: "rgba(9, 16, 31, 0.92)",
                  border: "1px solid rgba(184, 197, 216, 0.25)",
                  borderRadius: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{ r: 4, fill: "#4f46e5" }}
                activeDot={{ r: 6, fill: "#06b6d4" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="glass-card rounded-2xl p-5">
        <h3 className="font-display text-lg text-white">Subject Accuracy</h3>
        <p className="mt-1 text-sm text-slate-300">Maths, CS, English, Logical Reasoning</p>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={subjectAccuracy}
                dataKey="value"
                nameKey="subject"
                innerRadius={60}
                outerRadius={88}
                paddingAngle={3}
              >
                {subjectAccuracy.map((entry, index) => (
                  <Cell key={entry.subject} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(9, 16, 31, 0.92)",
                  border: "1px solid rgba(184, 197, 216, 0.25)",
                  borderRadius: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
          {subjectAccuracy.map((subject, index) => (
            <div key={subject.subject} className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: chartColors[index % chartColors.length] }}
              />
              <span>{subject.subject}</span>
              <span className="ml-auto font-mono-data">{subject.value}%</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
