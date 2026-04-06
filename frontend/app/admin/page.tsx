"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getAdminAnalytics,
  getAdminTests,
  getCurrentAuthProfile,
  getStudents,
  type AdminAnalyticsResponse,
  type AdminTest,
} from "@/lib/api";

const defaultAnalytics: AdminAnalyticsResponse = {
  metrics: {
    total_students_attempted: 0,
    average_score: 0,
    highest_score: 0,
    lowest_score: 0,
    accuracy_percentage: 0,
  },
  score_distribution: [],
  section_performance: [],
  difficulty_analysis: [],
};

const formatSchedule = (start: string | null, end: string | null) => {
  if (!start || !end) {
    return "Not scheduled";
  }

  return `${new Date(start).toLocaleString("en-IN")} - ${new Date(end).toLocaleString("en-IN")}`;
};

export default function AdminHomePage() {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse>(defaultAnalytics);
  const [loadError, setLoadError] = useState<string | null>(null);

  const authProfile = getCurrentAuthProfile();
  const adminName = authProfile.email
    ? authProfile.email.split("@")[0]
    : authProfile.userId
      ? `admin-${authProfile.userId.slice(0, 8)}`
      : "admin";
  const coachingInstituteName = tests[0]?.coaching_id
    ? `Institute ${tests[0].coaching_id.slice(0, 8)}`
    : "Institute not available";

  useEffect(() => {
    const load = async () => {
      try {
        const [pendingStudents, testsData, analyticsData] = await Promise.all([
          getStudents("pending"),
          getAdminTests(),
          getAdminAnalytics(),
        ]);

        setPendingCount(pendingStudents.length);
        setTests(testsData);
        setAnalytics(analyticsData);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load dashboard stats";
        setLoadError(message);
      }
    };

    void load();
  }, []);

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Coaching Admin Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">Institute Overview</h1>
        <p className="mt-2 text-sm text-slate-300">
          Monitor student activity, manage tests, and keep your coaching workflow streamlined.
        </p>
      </header>

      <section className="glass-card neon-ring rounded-3xl border border-cyan-300/25 bg-linear-to-br from-indigo-500/20 via-slate-900/45 to-cyan-500/20 p-5 md:p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Welcome to Testify</p>
        <h2 className="font-display mt-2 text-2xl font-semibold text-white md:text-3xl">
          Manage your coaching institute efficiently.
        </h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-2">
          <p>
            <span className="text-slate-300">Welcome back,</span>{" "}
            <span className="font-medium text-white">{adminName}</span>
          </p>
          <p>
            <span className="text-slate-300">Coaching:</span>{" "}
            <span className="font-medium text-white">{coachingInstituteName}</span>
          </p>
        </div>
      </section>

      {loadError ? (
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/12 p-5 text-rose-100">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="glass-card hover-lift rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Pending Students</p>
          <p className="font-display mt-1 text-2xl text-white">{pendingCount}</p>
        </article>
        <article className="glass-card hover-lift rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Total Students Attempted</p>
          <p className="font-display mt-1 text-2xl text-white">{analytics.metrics.total_students_attempted}</p>
        </article>
        <article className="glass-card hover-lift rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Average Score</p>
          <p className="font-display mt-1 text-2xl text-white">{analytics.metrics.average_score}</p>
        </article>
        <article className="glass-card hover-lift rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Accuracy %</p>
          <p className="font-display mt-1 text-2xl text-white">{analytics.metrics.accuracy_percentage}</p>
        </article>
      </div>

      <section className="glass-card rounded-2xl p-5">
        <h3 className="font-display text-xl text-white">Quick Actions</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/admin/students"
            className="hover-lift rounded-xl border border-cyan-300/30 bg-linear-to-r from-indigo-500/80 to-cyan-500/80 px-4 py-2 text-sm font-semibold text-white transition"
          >
            Open Student Management
          </Link>
          <Link
            href="/admin/create-test"
            className="hover-lift rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            Create New Test
          </Link>
          <Link
            href="/admin/question-bank"
            className="hover-lift rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            Manage Question Bank
          </Link>
          <Link
            href="/admin/test-series"
            className="hover-lift rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            Manage Test Series
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-card rounded-2xl p-5">
          <h3 className="font-display text-xl text-white">Scheduled Tests</h3>
          <div className="mt-4 space-y-3">
            {tests
              .filter((test) => Boolean(test.scheduled_start && test.scheduled_end))
              .slice(0, 5)
              .map((test) => (
                <article key={test.id} className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-slate-200">
                  <p className="font-medium text-white">{test.title}</p>
                  <p className="mt-1">{formatSchedule(test.scheduled_start, test.scheduled_end)}</p>
                </article>
              ))}
            {!tests.some((test) => Boolean(test.scheduled_start && test.scheduled_end)) ? (
              <p className="text-sm text-slate-300">No scheduled tests yet.</p>
            ) : null}
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h3 className="font-display text-xl text-white">All Tests</h3>
          <div className="mt-4 space-y-3">
            {tests.slice(0, 6).map((test) => (
              <article key={test.id} className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">{test.title}</p>
                  <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs uppercase tracking-[0.08em]">
                    {test.type.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-slate-300">
                  Questions: {test.total_questions} · Duration: {test.duration_minutes} mins
                </p>
              </article>
            ))}
            {!tests.length ? <p className="text-sm text-slate-300">No tests created yet.</p> : null}
          </div>
        </section>
      </div>

      <section className="glass-card rounded-2xl p-5">
        <h3 className="font-display text-xl text-white">Previous Test Analysis</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-white/15 bg-white/5 p-3">
            <p className="text-xs uppercase tracking-widest text-slate-300">Highest Score</p>
            <p className="font-display mt-1 text-2xl text-white">{analytics.metrics.highest_score}</p>
          </article>
          <article className="rounded-xl border border-white/15 bg-white/5 p-3">
            <p className="text-xs uppercase tracking-widest text-slate-300">Lowest Score</p>
            <p className="font-display mt-1 text-2xl text-white">{analytics.metrics.lowest_score}</p>
          </article>
          <article className="rounded-xl border border-white/15 bg-white/5 p-3">
            <p className="text-xs uppercase tracking-widest text-slate-300">Score Buckets</p>
            <p className="font-display mt-1 text-2xl text-white">{analytics.score_distribution.length}</p>
          </article>
        </div>
      </section>
    </section>
  );
}
