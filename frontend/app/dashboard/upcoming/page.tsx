"use client";

import { useEffect } from "react";
import { TestList } from "@/components/dashboard/TestList";
import { useStudentStore } from "@/store/studentStore";

export default function UpcomingTestsPage() {
  const {
    upcomingTests,
    isLoadingUpcoming,
    upcomingError,
    fetchUpcomingTests,
  } = useStudentStore();

  useEffect(() => {
    void fetchUpcomingTests();
  }, [fetchUpcomingTests]);

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">
          Scheduled Tests
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Track your scheduled mock tests and be exam ready.
        </p>
      </header>

      <TestList
        tests={upcomingTests}
        loading={isLoadingUpcoming}
        error={upcomingError}
        mode="upcoming"
        emptyTitle="No scheduled tests"
        emptyDescription="There are no future test windows scheduled for your account yet."
      />
    </section>
  );
}
