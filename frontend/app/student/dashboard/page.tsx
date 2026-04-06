"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, getTestLeaderboard, type TestLeaderboardResponse } from "@/lib/api";
import { useStudentStore } from "@/store/studentStore";

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export default function StudentDashboardPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<TestLeaderboardResponse | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const {
    dashboardOverview,
    isLoadingOverview,
    overviewError,
    fetchDashboardOverview,
  } = useStudentStore();

  useEffect(() => {
    void fetchDashboardOverview();
  }, [fetchDashboardOverview]);

  const latestLeaderboardTestId = dashboardOverview?.recent_results?.[0]?.test_id;

  useEffect(() => {
    if (!latestLeaderboardTestId) {
      setLeaderboard(null);
      setLeaderboardError(null);
      return;
    }

    let ignore = false;

    const loadLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      setLeaderboardError(null);

      try {
        const payload = await getTestLeaderboard(latestLeaderboardTestId, { top_n: 5 });
        if (!ignore) {
          setLeaderboard(payload);
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        if (error instanceof ApiError) {
          setLeaderboardError(error.message);
        } else if (error instanceof Error) {
          setLeaderboardError(error.message);
        } else {
          setLeaderboardError("Unable to load leaderboard right now.");
        }
      } finally {
        if (!ignore) {
          setIsLoadingLeaderboard(false);
        }
      }
    };

    void loadLeaderboard();

    return () => {
      ignore = true;
    };
  }, [latestLeaderboardTestId]);

  const summary = dashboardOverview?.performance_summary;

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">
          Dashboard Overview
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Track upcoming tests, recent results, quick actions and your performance summary.
        </p>
      </header>

      {overviewError ? (
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/12 p-5 text-rose-100">
          <p className="font-medium">Unable to load dashboard overview</p>
          <p className="mt-1 text-sm">{overviewError}</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Total Tests Attempted</p>
          <p className="font-display mt-1 text-2xl text-white">
            {isLoadingOverview ? "..." : summary?.total_tests_attempted ?? 0}
          </p>
        </article>
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Average Score</p>
          <p className="font-display mt-1 text-2xl text-white">
            {isLoadingOverview ? "..." : summary?.average_score?.toFixed(2) ?? "0.00"}
          </p>
        </article>
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Highest Score</p>
          <p className="font-display mt-1 text-2xl text-white">
            {isLoadingOverview ? "..." : summary?.highest_score?.toFixed(2) ?? "0.00"}
          </p>
        </article>
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Accuracy Percentage</p>
          <p className="font-display mt-1 text-2xl text-white">
            {isLoadingOverview ? "..." : summary?.accuracy_percentage?.toFixed(2) ?? "0.00"}%
          </p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-white">Upcoming Tests</h2>
            <Link href="/student/scheduled-tests" className="text-sm text-cyan-100 hover:text-white">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {(dashboardOverview?.upcoming_tests || []).slice(0, 5).map((test) => (
              <article key={test.id} className="rounded-xl border border-white/15 bg-white/5 p-4">
                <p className="font-display text-lg text-white">{test.test_name}</p>
                <p className="mt-1 text-sm text-slate-300">{test.coaching_name}</p>
                <p className="mt-1 text-sm text-slate-200">
                  {formatDateTime(test.test_date)} · {test.duration_minutes} mins
                </p>
                <button
                  type="button"
                  disabled={!test.can_attempt_now}
                  onClick={() => {
                    if (test.can_attempt_now) {
                      router.push(`/student/exam/${test.id}`);
                    }
                  }}
                  className={`mt-3 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    test.can_attempt_now
                      ? "bg-indigo-500 text-white hover:bg-indigo-400"
                      : "cursor-not-allowed border border-white/20 bg-white/5 text-slate-400"
                  }`}
                >
                  Attempt Test
                </button>
              </article>
            ))}
            {!isLoadingOverview && !(dashboardOverview?.upcoming_tests || []).length ? (
              <p className="text-sm text-slate-300">No upcoming tests available.</p>
            ) : null}
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-white">Recent Results</h2>
            <Link href="/student/results" className="text-sm text-cyan-100 hover:text-white">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {(dashboardOverview?.recent_results || []).map((result) => (
              <Link
                key={result.id}
                href={`/student/results/${result.id}`}
                className="block rounded-xl border border-white/15 bg-white/5 p-4 transition hover:border-cyan-300/50"
              >
                <p className="font-display text-lg text-white">{result.test_name}</p>
                <p className="mt-1 text-sm text-slate-200">
                  Score {result.score} · Rank {result.rank ?? "-"} · Accuracy {result.accuracy.toFixed(2)}%
                </p>
              </Link>
            ))}
            {!isLoadingOverview && !(dashboardOverview?.recent_results || []).length ? (
              <p className="text-sm text-slate-300">No results yet.</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-white">Leaderboard Snapshot</h2>
          <Link href="/student/results" className="text-sm text-cyan-100 hover:text-white">
            View results
          </Link>
        </div>

        {isLoadingLeaderboard ? <p className="mt-3 text-sm text-slate-300">Loading leaderboard...</p> : null}
        {leaderboardError ? <p className="mt-3 text-sm text-rose-200">{leaderboardError}</p> : null}

        {!isLoadingLeaderboard && !leaderboardError ? (
          leaderboard ? (
            <>
              <p className="mt-2 text-sm text-slate-300">
                {leaderboard.test_name} · Your rank: {leaderboard.my_rank ?? "-"}
              </p>
              <div className="mt-3 space-y-2">
                {leaderboard.leaderboard.map((entry) => (
                  <article
                    key={entry.result_id}
                    className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                  >
                    <p className="text-slate-100">
                      #{entry.rank} {entry.student_name}
                    </p>
                    <p className="text-slate-300">
                      {entry.total_score} pts · {entry.accuracy_percentage.toFixed(2)}%
                    </p>
                  </article>
                ))}
                {!leaderboard.leaderboard.length ? (
                  <p className="text-sm text-slate-300">No leaderboard data available yet.</p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-300">Take a test to see leaderboard rankings here.</p>
          )
        ) : null}
      </section>

      <section className="glass-card rounded-2xl p-5">
        <h2 className="font-display text-xl text-white">Quick Actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/student/scheduled-tests" className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
            Attempt Scheduled Test
          </Link>
          <Link href="/student/results" className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
            View Results
          </Link>
          <Link href="/student/my-test-series" className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
            Explore Test Series
          </Link>
          <Link href="/student/analytics" className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
            View Performance Analytics
          </Link>
        </div>
      </section>
    </section>
  );
}
