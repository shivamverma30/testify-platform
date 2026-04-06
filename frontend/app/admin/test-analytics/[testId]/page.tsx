"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ApiError,
  getAdminTestAnalyticsByQuery,
  type AdminTestAnalyticsResponse,
} from "@/lib/api";

type AdminTestAnalyticsPageProps = {
  params: {
    testId: string;
  };
};

const difficultyLabelMap: Record<"easy" | "medium" | "hard", string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function AdminTestAnalyticsPage({ params }: AdminTestAnalyticsPageProps) {
  const QUESTIONS_PAGE_SIZE = 5;
  const [analytics, setAnalytics] = useState<AdminTestAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionPage, setQuestionPage] = useState(1);

  useEffect(() => {
    let ignore = false;

    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const payload = await getAdminTestAnalyticsByQuery(params.testId, {
          page: questionPage,
          limit: QUESTIONS_PAGE_SIZE,
        });

        if (!ignore) {
          setAnalytics(payload);
        }
      } catch (err) {
        if (ignore) {
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unable to load test analytics right now.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadAnalytics();

    return () => {
      ignore = true;
    };
  }, [params.testId, questionPage]);

  useEffect(() => {
    setQuestionPage(1);
  }, [params.testId]);

  const difficultyChartData = useMemo(() => {
    if (!analytics) {
      return [];
    }

    return analytics.difficulty_analysis.map((item) => ({
      difficulty: difficultyLabelMap[item.difficulty],
      accuracy: item.accuracy_percentage,
      attempted: item.attempted,
    }));
  }, [analytics]);

  const questionPagination = analytics?.question_analytics.incorrect_questions.pagination;

  if (loading) {
    return (
      <section className="space-y-4 page-enter">
        <h1 className="font-display text-2xl text-white">Loading Test Analytics...</h1>
      </section>
    );
  }

  if (error || !analytics) {
    return (
      <section className="space-y-4 page-enter">
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/12 p-5 text-rose-100">
          <p className="font-medium">Unable to load test analytics</p>
          <p className="mt-1 text-sm">{error || "Analytics not found."}</p>
        </div>
        <Link
          href="/admin/all-tests"
          className="inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
        >
          Back to All Tests
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Coaching Admin Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">Test Analytics</h1>
        <p className="mt-2 text-sm text-slate-300">{analytics.test.title}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Students Attempted</p>
          <p className="font-display mt-1 text-2xl text-white">{analytics.metrics.total_students_attempted}</p>
        </article>
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Average Score</p>
          <p className="font-display mt-1 text-2xl text-white">{analytics.metrics.average_score}</p>
        </article>
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Highest Score</p>
          <p className="font-display mt-1 text-2xl text-white">{analytics.metrics.highest_score}</p>
        </article>
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Lowest Score</p>
          <p className="font-display mt-1 text-2xl text-white">{analytics.metrics.lowest_score}</p>
        </article>
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Accuracy</p>
          <p className="font-display mt-1 text-2xl text-white">{analytics.metrics.accuracy_percentage}%</p>
        </article>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="glass-card rounded-2xl p-5">
          <h2 className="font-display text-xl text-white">Score Distribution</h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.score_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
                <XAxis dataKey="range" stroke="#b8c5d8" />
                <YAxis stroke="#b8c5d8" />
                <Tooltip
                  contentStyle={{
                    background: "rgba(9, 16, 31, 0.92)",
                    border: "1px solid rgba(184, 197, 216, 0.25)",
                    borderRadius: "12px",
                  }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="glass-card rounded-2xl p-5">
          <h2 className="font-display text-xl text-white">Difficulty Accuracy</h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
                <XAxis dataKey="difficulty" stroke="#b8c5d8" />
                <YAxis stroke="#b8c5d8" />
                <Tooltip
                  contentStyle={{
                    background: "rgba(9, 16, 31, 0.92)",
                    border: "1px solid rgba(184, 197, 216, 0.25)",
                    borderRadius: "12px",
                  }}
                />
                <Bar dataKey="accuracy" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <h2 className="font-display text-xl text-white">Section Performance</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm text-slate-200">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-300">
              <tr>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Attempted</th>
                <th className="px-3 py-2">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {analytics.section_performance.map((section) => (
                <tr key={section.section_name} className="border-t border-white/10">
                  <td className="px-3 py-2">{section.section_name}</td>
                  <td className="px-3 py-2">{section.attempted}</td>
                  <td className="px-3 py-2">{section.accuracy_percentage.toFixed(2)}%</td>
                </tr>
              ))}
              {!analytics.section_performance.length ? (
                <tr>
                  <td className="px-3 py-3 text-slate-300" colSpan={3}>
                    No section analytics available yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl text-white">Most Incorrect Questions</h2>
            {questionPagination ? (
              <p className="text-xs text-slate-300">
                Page {questionPagination.page} of {questionPagination.total_pages}
              </p>
            ) : null}
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-200">
            {analytics.most_incorrect_questions.map((item) => (
              <article key={item.question_id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="text-white">{item.question_text}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {item.subject} / {item.topic} · Wrong {item.wrong_count} · Attempted {item.attempted_count} · Accuracy {item.accuracy_percentage.toFixed(2)}%
                </p>
              </article>
            ))}
            {!analytics.most_incorrect_questions.length ? <p>No data yet.</p> : null}
          </div>
        </article>

        <article className="glass-card rounded-2xl p-5">
          <h2 className="font-display text-xl text-white">Most Attempted Questions</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-200">
            {analytics.most_attempted_questions.map((item) => (
              <article key={item.question_id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="text-white">{item.question_text}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {item.subject} / {item.topic} · Attempted {item.attempted_count} · Wrong {item.wrong_count} · Accuracy {item.accuracy_percentage.toFixed(2)}%
                </p>
              </article>
            ))}
            {!analytics.most_attempted_questions.length ? <p>No data yet.</p> : null}
          </div>
        </article>
      </section>

      {questionPagination ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-sm text-slate-300">
            Showing {QUESTIONS_PAGE_SIZE} questions per page · Total {questionPagination.total_items}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuestionPage((prev) => Math.max(prev - 1, 1))}
              disabled={!questionPagination.has_prev || loading}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setQuestionPage((prev) => prev + 1)}
              disabled={!questionPagination.has_next || loading}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      ) : null}

      <Link
        href="/admin/all-tests"
        className="inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
      >
        Back to All Tests
      </Link>
    </section>
  );
}
