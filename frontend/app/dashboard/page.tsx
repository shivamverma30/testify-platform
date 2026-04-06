"use client";

import { useEffect } from "react";
import {
  CalendarClock,
  ChartNoAxesCombined,
  ClipboardCheck,
  Rocket,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { OverviewCard } from "@/components/dashboard/OverviewCard";
import { TestList } from "@/components/dashboard/TestList";
import { useStudentStore } from "@/store/studentStore";

const AnalyticsCharts = dynamic(
  () => import("@/components/dashboard/AnalyticsCharts").then((mod) => mod.AnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl border border-white/10 bg-slate-900/70" />
        <div className="h-80 animate-pulse rounded-2xl border border-white/10 bg-slate-900/70" />
      </section>
    ),
  },
);

export default function DashboardPage() {
  const {
    availableTests,
    upcomingTests,
    purchasedTests,
    isLoadingAvailable,
    isLoadingUpcoming,
    isLoadingPurchased,
    availableError,
    upcomingError,
    fetchAvailableTests,
    fetchUpcomingTests,
    fetchPurchasedTests,
  } = useStudentStore();

  useEffect(() => {
    void Promise.all([
      fetchAvailableTests(),
      fetchUpcomingTests(),
      fetchPurchasedTests(),
    ]);
  }, [fetchAvailableTests, fetchUpcomingTests, fetchPurchasedTests]);

  const availablePreview = availableTests.slice(0, 2);
  const upcomingPreview = upcomingTests.slice(0, 2);
  const lastIncompleteTest = upcomingTests[0] || availableTests[0] || null;

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
    <section className="space-y-8 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Welcome Back
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
          Access official sections: available tests, scheduled tests, purchased series, history, results, leaderboard, and analytics.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tests Taken", value: "27" },
          { label: "Average Score", value: "78" },
          { label: "Rank", value: "214" },
          { label: "Accuracy %", value: "84" },
        ].map((item) => (
          <article key={item.label} className="glass-card rounded-2xl px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{item.label}</p>
            <p className="font-display mt-1 text-2xl text-white">{item.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <OverviewCard
          title="Total Purchased Tests"
          value={purchasedTests.length}
          subtitle={
            isLoadingPurchased
              ? "Syncing your purchases..."
              : "All purchased series linked to your account"
          }
          icon={<ShoppingBag size={18} />}
          tone="green"
        />
        <OverviewCard
          title="Available Tests"
          value={availableTests.length}
          subtitle={
            isLoadingAvailable
              ? "Checking active schedules..."
              : "Live now and ready to attempt"
          }
          icon={<ClipboardCheck size={18} />}
          tone="blue"
        />
        <OverviewCard
          title="Scheduled Tests"
          value={upcomingTests.length}
          subtitle={
            isLoadingUpcoming
              ? "Loading future windows..."
              : "Scheduled tests queued for your account"
          }
          icon={<CalendarClock size={18} />}
          tone="amber"
        />
      </div>

      <section className="glass-card rounded-2xl p-5">
        <h2 className="font-display text-xl text-white">Dashboard Sections</h2>
        <p className="mt-1 text-sm text-slate-300">Navigate core student features from one place.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/dashboard/tests", label: "Available Tests" },
            { href: "/dashboard/upcoming", label: "Scheduled Tests" },
            { href: "/dashboard/purchased", label: "Purchased Test Series" },
            { href: "/dashboard/history", label: "Test History" },
            { href: "/dashboard/results", label: "Results" },
            { href: "/dashboard/leaderboard", label: "Leaderboard" },
            { href: "/dashboard/analytics", label: "Performance Analytics" },
          ].map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
            >
              {section.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="glass-card rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-white">Continue Where You Left Off</h2>
            <Rocket size={18} className="text-cyan-200" />
          </div>
          {lastIncompleteTest ? (
            <div className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-4">
              <p className="font-display text-lg text-white">{lastIncompleteTest.title}</p>
              <p className="mt-1 text-sm text-slate-300">
                Duration {lastIncompleteTest.duration_minutes} mins · {lastIncompleteTest.total_marks} marks
              </p>
              <Link
                href="/dashboard/tests"
                className="mt-4 inline-flex rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Resume Test
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-300">No active test in progress right now.</p>
          )}
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h2 className="font-display text-xl text-white">Quick Actions</h2>
          <div className="mt-4 grid gap-3">
            <Link
              href="/dashboard/tests"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
            >
              <ClipboardCheck size={16} />
              Start New Test
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
            >
              <Trophy size={16} />
              View Leaderboard
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
            >
              <ChartNoAxesCombined size={16} />
              Analytics
            </button>
          </div>
        </section>
      </div>

      <AnalyticsCharts scoreTrend={scoreTrend} subjectAccuracy={subjectAccuracy} />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-card space-y-4 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-white">Available Tests</h2>
            <Link
              href="/dashboard/tests"
              className="text-sm font-medium text-cyan-100 hover:text-white"
            >
              View all
            </Link>
          </div>
          <TestList
            tests={availablePreview}
            loading={isLoadingAvailable}
            error={availableError}
            mode="available"
            emptyTitle="No active tests"
            emptyDescription="Your available tests will appear here once a schedule is live."
          />
        </section>

        <section className="glass-card space-y-4 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-white">Scheduled Tests</h2>
            <Link
              href="/dashboard/upcoming"
              className="text-sm font-medium text-cyan-100 hover:text-white"
            >
              View all
            </Link>
          </div>
          <TestList
            tests={upcomingPreview}
            loading={isLoadingUpcoming}
            error={upcomingError}
            mode="upcoming"
            emptyTitle="No upcoming schedules"
            emptyDescription="Future scheduled tests will appear here automatically."
          />
        </section>
      </div>
    </section>
  );
}
