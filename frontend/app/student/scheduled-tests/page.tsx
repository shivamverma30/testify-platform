"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

const labelByStatus = {
  not_started: "Not Started",
  available_to_attempt: "Available to Attempt",
  completed: "Completed",
};

export default function ScheduledTestsPage() {
  const router = useRouter();
  const {
    scheduledTests,
    isLoadingScheduled,
    scheduledError,
    fetchScheduledTests,
  } = useStudentStore();

  useEffect(() => {
    void fetchScheduledTests();
  }, [fetchScheduledTests]);

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">
          Scheduled Tests
        </h1>
      </header>

      {scheduledError ? (
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/12 p-5 text-rose-100">
          <p className="font-medium">Unable to load scheduled tests</p>
          <p className="mt-1 text-sm">{scheduledError}</p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
        <table className="w-full min-w-[860px] text-left text-sm text-slate-200">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-300">
            <tr>
              <th className="px-4 py-3">Test Name</th>
              <th className="px-4 py-3">Test Type</th>
              <th className="px-4 py-3">Total Questions</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Scheduled Time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingScheduled ? (
              <tr>
                <td className="px-4 py-4 text-slate-300" colSpan={7}>
                  Loading scheduled tests...
                </td>
              </tr>
            ) : !scheduledTests.length ? (
              <tr>
                <td className="px-4 py-4 text-slate-300" colSpan={7}>
                  No scheduled tests found.
                </td>
              </tr>
            ) : (
              scheduledTests.map((test) => (
                <tr key={test.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-white">{test.test_name}</td>
                  <td className="px-4 py-3">{test.test_type.replace("_", " ")}</td>
                  <td className="px-4 py-3">{test.total_questions}</td>
                  <td className="px-4 py-3">{test.duration_minutes} mins</td>
                  <td className="px-4 py-3">{formatDateTime(test.scheduled_time)}</td>
                  <td className="px-4 py-3">{labelByStatus[test.status]}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={test.status !== "available_to_attempt"}
                      onClick={() => {
                        if (test.status === "available_to_attempt") {
                          router.push(`/student/exam/${test.id}`);
                        }
                      }}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium ${
                        test.status === "available_to_attempt"
                          ? "bg-indigo-500 text-white hover:bg-indigo-400"
                          : "cursor-not-allowed border border-white/20 bg-white/5 text-slate-400"
                      }`}
                    >
                      Start Test
                    </button>
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
