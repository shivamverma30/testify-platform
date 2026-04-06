"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useStudentStore } from "@/store/studentStore";

const AnalyticsCharts = dynamic(
  () => import("@/components/dashboard/AnalyticsCharts").then((mod) => mod.AnalyticsCharts),
  { ssr: false },
);

export default function StudentAnalyticsPage() {
  const {
    analytics,
    isLoadingAnalytics,
    analyticsError,
    fetchAnalytics,
  } = useStudentStore();

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const scoreTrend = (analytics?.score_trend || []).map((item) => ({
    label: item.label,
    score: item.score,
  }));

  const subjectAccuracy = (analytics?.subject_wise_performance || []).map((item) => ({
    subject: item.subject,
    value: item.accuracy_percentage,
  }));

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">
          Performance Analytics
        </h1>
      </header>

      {analyticsError ? (
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/12 p-5 text-rose-100">
          <p className="font-medium">Unable to load analytics</p>
          <p className="mt-1 text-sm">{analyticsError}</p>
        </div>
      ) : null}

      {isLoadingAnalytics ? (
        <p className="text-sm text-slate-300">Loading analytics...</p>
      ) : (
        <>
          <AnalyticsCharts scoreTrend={scoreTrend} subjectAccuracy={subjectAccuracy} />
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="glass-card rounded-2xl p-5">
              <h2 className="font-display text-xl text-white">Weak Topics</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                {(analytics?.weak_topics || []).map((topic) => (
                  <p key={topic.topic}>
                    {topic.topic}: {topic.accuracy_percentage.toFixed(2)}%
                  </p>
                ))}
                {!(analytics?.weak_topics || []).length ? <p>No data yet.</p> : null}
              </div>
            </section>
            <section className="glass-card rounded-2xl p-5">
              <h2 className="font-display text-xl text-white">Strong Topics</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                {(analytics?.strong_topics || []).map((topic) => (
                  <p key={topic.topic}>
                    {topic.topic}: {topic.accuracy_percentage.toFixed(2)}%
                  </p>
                ))}
                {!(analytics?.strong_topics || []).length ? <p>No data yet.</p> : null}
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
