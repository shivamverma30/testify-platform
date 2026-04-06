"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useStudentStore } from "@/store/studentStore";

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export default function AttemptHistoryPage() {
  const {
    attemptHistory,
    isLoadingHistory,
    historyError,
    fetchAttemptHistory,
  } = useStudentStore();

  useEffect(() => {
    void fetchAttemptHistory();
  }, [fetchAttemptHistory]);

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">
          Attempt History
        </h1>
      </header>

      {historyError ? (
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/12 p-5 text-rose-100">
          <p className="font-medium">Unable to load attempt history</p>
          <p className="mt-1 text-sm">{historyError}</p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
        <table className="w-full min-w-[860px] text-left text-sm text-slate-200">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-300">
            <tr>
              <th className="px-4 py-3">Test Name</th>
              <th className="px-4 py-3">Attempt Date</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingHistory ? (
              <tr>
                <td className="px-4 py-4 text-slate-300" colSpan={6}>
                  Loading attempt history...
                </td>
              </tr>
            ) : !attemptHistory.length ? (
              <tr>
                <td className="px-4 py-4 text-slate-300" colSpan={6}>
                  No attempts found.
                </td>
              </tr>
            ) : (
              attemptHistory.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-white">{item.test_name}</td>
                  <td className="px-4 py-3">{formatDate(item.attempt_date)}</td>
                  <td className="px-4 py-3">{item.score ?? "-"}</td>
                  <td className="px-4 py-3">{item.rank ?? "-"}</td>
                  <td className="px-4 py-3">{item.status === "completed" ? "Completed" : "In Progress"}</td>
                  <td className="px-4 py-3">
                    {item.result_id ? (
                      <Link
                        href={`/student/results/${item.result_id}`}
                        className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-white/10"
                      >
                        View Result
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Result pending</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
