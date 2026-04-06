"use client";

import { useEffect } from "react";
import { useStudentStore } from "@/store/studentStore";

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
};

export default function MyTestSeriesPage() {
  const {
    purchasedTests,
    isLoadingPurchased,
    purchasedError,
    fetchPurchasedTests,
  } = useStudentStore();

  useEffect(() => {
    void fetchPurchasedTests();
  }, [fetchPurchasedTests]);

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">
          My Test Series
        </h1>
      </header>

      {purchasedError ? (
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/12 p-5 text-rose-100">
          <p className="font-medium">Unable to load purchased series</p>
          <p className="mt-1 text-sm">{purchasedError}</p>
        </div>
      ) : null}

      {isLoadingPurchased ? (
        <p className="text-sm text-slate-300">Loading purchased test series...</p>
      ) : !purchasedTests.length ? (
        <p className="text-sm text-slate-300">No purchased test series found.</p>
      ) : (
        <div className="grid gap-4">
          {purchasedTests.map((series) => (
            <article key={series.id} className="glass-card rounded-2xl p-5">
              <div className="flex flex-col gap-1">
                <p className="font-display text-xl text-white">{series.series_name}</p>
                <p className="text-sm text-cyan-100">{series.coaching_name}</p>
                <p className="text-sm text-slate-300">
                  {series.number_of_tests} tests · INR {series.price} · Purchased on {formatDate(series.purchase_date)}
                </p>
              </div>

              {series.tests.length ? (
                <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full min-w-175 text-left text-sm text-slate-200">
                    <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-300">
                      <tr>
                        <th className="px-4 py-2">Test</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Questions</th>
                        <th className="px-4 py-2">Duration</th>
                        <th className="px-4 py-2">Scheduled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.tests.map((test) => (
                        <tr key={test.id} className="border-t border-white/10">
                          <td className="px-4 py-2 text-white">{test.title}</td>
                          <td className="px-4 py-2">{test.type.replace("_", " ")}</td>
                          <td className="px-4 py-2">{test.total_questions}</td>
                          <td className="px-4 py-2">{test.duration_minutes} mins</td>
                          <td className="px-4 py-2">{test.scheduled_start ? formatDate(test.scheduled_start) : "Not scheduled"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-300">No active tests available in this series.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
