import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";

export default function DashboardAnalyticsPage() {
  const scoreTrend = [
    { label: "Mock 8", score: 61 },
    { label: "Mock 9", score: 66 },
    { label: "Mock 10", score: 69 },
    { label: "Mock 11", score: 74 },
    { label: "Mock 12", score: 78 },
  ];

  const subjectAccuracy = [
    { subject: "Maths", value: 82 },
    { subject: "Computer Science", value: 88 },
    { subject: "English", value: 79 },
    { subject: "Logical Reasoning", value: 84 },
  ];

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">
          Performance Analytics
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Track score trend and subject-wise accuracy.
        </p>
      </header>

      <AnalyticsCharts scoreTrend={scoreTrend} subjectAccuracy={subjectAccuracy} />
    </section>
  );
}
