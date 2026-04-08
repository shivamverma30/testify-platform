"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { deleteAdminTest, getAdminTests, scheduleTest, updateTest, type AdminTest } from "@/lib/api";

export default function AllTestsPage() {
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");

  const loadTests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAdminTests();
      setTests(result);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to load tests.";
      setError(message);
      setTests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTests();
  }, [loadTests]);

  const onDelete = async (testId: string) => {
    setError(null);

    try {
      await deleteAdminTest(testId);
      setTests((current) => current.filter((item) => item.id !== testId));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to delete test.";
      setError(message);
    }
  };

  const onEditStart = (test: AdminTest) => {
    setEditingId(test.id);
    setEditTitle(test.title);
  };

  const onEditSave = async () => {
    if (!editingId) return;

    setError(null);

    try {
      const updated = await updateTest(editingId, { title: editTitle });
      setTests((current) => current.map((item) => (item.id === editingId ? { ...item, ...updated } : item)));
      setEditingId(null);
      setEditTitle("");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to update test.";
      setError(message);
    }
  };

  const onScheduleSave = async () => {
    if (!scheduleId) return;

    setError(null);

    try {
      const updated = await scheduleTest(scheduleId, {
        scheduled_start: new Date(scheduledStart).toISOString(),
        scheduled_end: new Date(scheduledEnd).toISOString(),
      });
      setTests((current) => current.map((item) => (item.id === scheduleId ? { ...item, ...updated } : item)));
      setScheduleId(null);
      setScheduledStart("");
      setScheduledEnd("");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to schedule test.";
      setError(message);
    }
  };

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">All Tests</p>
        <h2 className="font-display mt-1 text-3xl text-white">Manage Created Tests</h2>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {isLoading ? <p className="text-sm text-slate-300">Loading tests...</p> : null}

      {!isLoading ? (
        <div className="space-y-3">
          {tests.map((test) => (
            <article key={test.id} className="glass-card rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/admin/all-tests/${test.id}`} className="font-display text-lg text-white hover:text-cyan-100">
                    {test.title}
                  </Link>
                  <p className="text-sm text-slate-300">
                    {test.type.replace("_", " ")} · {test.total_questions} questions · {test.duration_minutes} mins
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    {test.subject || "General"} · {test.topic || "General"} · {test.difficulty || "mixed"}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    Schedule: {test.scheduled_start && test.scheduled_end
                      ? `${new Date(test.scheduled_start).toLocaleString("en-IN")} - ${new Date(test.scheduled_end).toLocaleString("en-IN")}`
                      : "Not scheduled"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/all-tests/${test.id}`}
                    className="rounded-lg border border-emerald-300/40 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/25"
                  >
                    Open
                  </Link>
                  <Link
                    href={`/admin/test-analytics/${test.id}`}
                    className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/25"
                  >
                    Analytics
                  </Link>
                  <button type="button" onClick={() => onEditStart(test)} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs text-white hover:bg-indigo-400">Edit</button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleId(test.id);
                      setScheduledStart(test.scheduled_start ? test.scheduled_start.slice(0, 16) : "");
                      setScheduledEnd(test.scheduled_end ? test.scheduled_end.slice(0, 16) : "");
                    }}
                    className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                  >
                    Schedule
                  </button>
                  <button type="button" onClick={() => void onDelete(test.id)} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs text-white hover:bg-rose-400">Delete</button>
                </div>
              </div>

              {editingId === test.id ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm"
                  />
                  <button type="button" onClick={() => void onEditSave()} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs text-white hover:bg-emerald-400">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10">Cancel</button>
                </div>
              ) : null}

              {scheduleId === test.id ? (
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <input
                    type="datetime-local"
                    value={scheduledStart}
                    onChange={(event) => setScheduledStart(event.target.value)}
                    className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm"
                  />
                  <input
                    type="datetime-local"
                    value={scheduledEnd}
                    onChange={(event) => setScheduledEnd(event.target.value)}
                    className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void onScheduleSave()} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs text-white hover:bg-emerald-400">Save Schedule</button>
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleId(null);
                        setScheduledStart("");
                        setScheduledEnd("");
                      }}
                      className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {!tests.length ? <p className="text-sm text-slate-300">No tests available.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
