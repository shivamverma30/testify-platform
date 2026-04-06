"use client";

import { useEffect, useState } from "react";
import { getSuperAdminStats, type SuperAdminStats } from "@/lib/api";

const initialStats: SuperAdminStats = {
  total_coaching_institutes: 0,
  total_students: 0,
  total_tests: 0,
  pending_coaching_approvals: 0,
  pending_student_approvals: 0,
};

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<SuperAdminStats>(initialStats);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const result = await getSuperAdminStats();
        setStats(result);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "Unable to load stats";
        setError(message);
      }
    };

    void loadStats();
  }, []);

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-fuchsia-200">Super Admin Dashboard</p>
        <h2 className="font-display mt-1 text-3xl text-white">Platform Overview</h2>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Total Coaching Institutes</p>
          <p className="font-display mt-1 text-3xl text-white">{stats.total_coaching_institutes}</p>
        </article>
        <article className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Total Students</p>
          <p className="font-display mt-1 text-3xl text-white">{stats.total_students}</p>
        </article>
        <article className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Total Tests</p>
          <p className="font-display mt-1 text-3xl text-white">{stats.total_tests}</p>
        </article>
        <article className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Pending Coaching Approvals</p>
          <p className="font-display mt-1 text-3xl text-white">{stats.pending_coaching_approvals}</p>
        </article>
      </div>

      <article className="glass-card rounded-2xl p-5 text-sm text-slate-200">
        Platform statistics are live and connected to protected super admin APIs.
      </article>
    </section>
  );
}
