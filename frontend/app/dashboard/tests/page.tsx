"use client";

import { useEffect } from "react";
import { TestList } from "@/components/dashboard/TestList";
import { useStudentStore } from "@/store/studentStore";

export default function AvailableTestsPage() {
  const {
    availableTests,
    isLoadingAvailable,
    availableError,
    fetchAvailableTests,
  } = useStudentStore();

  useEffect(() => {
    void fetchAvailableTests();
  }, [fetchAvailableTests]);

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">
          Available Tests
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          These tests are live right now and ready to start.
        </p>
      </header>

      <TestList
        tests={availableTests}
        loading={isLoadingAvailable}
        error={availableError}
        mode="available"
        emptyTitle="No active tests available"
        emptyDescription="Your coaching has not published any currently active test window."
      />
    </section>
  );
}
