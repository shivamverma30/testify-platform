"use client";

import { useEffect } from "react";
import { CalendarDays, Package2 } from "lucide-react";
import { useStudentStore } from "@/store/studentStore";

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export default function PurchasedPage() {
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
          Purchased Test Series
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          All test series purchased from marketplace or coaching subscriptions.
        </p>
      </header>

      {isLoadingPurchased ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-white/10 bg-linear-to-r from-slate-900/70 to-slate-800/70"
            />
          ))}
        </div>
      ) : purchasedError ? (
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/12 p-5 text-rose-100">
          <p className="font-medium">Unable to load purchases</p>
          <p className="mt-1 text-sm">{purchasedError}</p>
        </div>
      ) : !purchasedTests.length ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <h3 className="font-display text-lg font-semibold text-white">No purchased test series</h3>
          <p className="mt-2 text-sm text-slate-300">
            Purchased series will appear here once your backend endpoint is active.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {purchasedTests.map((series) => (
            <article
              key={series.id}
              className="glass-card hover-lift rounded-2xl p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-xl font-semibold tracking-tight text-slate-100">
                    {series.series_name}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-200">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                      <Package2 size={14} />
                      {series.number_of_tests} tests
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                      <CalendarDays size={14} />
                      Purchased {formatDate(series.purchase_date)}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
