"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  approveCoaching,
  getPendingCoachings,
  rejectCoaching,
  type PendingCoaching,
} from "@/lib/api";

export default function CoachingApprovalsPage() {
  const [coachings, setCoachings] = useState<PendingCoaching[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPendingCoachings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getPendingCoachings();
      setCoachings(result);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to load pending coachings.";
      setError(message);
      setCoachings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPendingCoachings();
  }, [fetchPendingCoachings]);

  const onAction = async (coachingId: string, action: "approve" | "reject") => {
    setActionId(coachingId);

    try {
      if (action === "approve") {
        await approveCoaching(coachingId);
      } else {
        await rejectCoaching(coachingId);
      }

      setCoachings((current) => current.filter((item) => item.id !== coachingId));
    } catch (requestError) {
      const message =
        requestError instanceof ApiError
          ? requestError.message
          : "Unable to perform this action right now.";
      setError(message);
    } finally {
      setActionId(null);
    }
  };

  return (
    <section className="space-y-5 page-enter">
      <header>
        <p className="text-sm font-medium text-fuchsia-200">Approvals</p>
        <h2 className="font-display mt-1 text-3xl text-white">Pending Coaching Registrations</h2>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
          Loading pending coaching registrations...
        </div>
      ) : null}

      {!isLoading && coachings.length === 0 ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-sm text-emerald-100">
          No pending coaching approvals.
        </div>
      ) : null}

      {!isLoading && coachings.length > 0 ? (
        <div className="space-y-3">
          {coachings.map((coaching) => (
            <article
              key={coaching.id}
              className="glass-card flex flex-col gap-4 rounded-2xl p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-display text-lg text-white">{coaching.instituteName}</p>
                <p className="text-sm text-slate-300">Admin: {coaching.adminName}</p>
                <p className="text-sm text-slate-300">{coaching.user.email} · {coaching.phoneNumber}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionId === coaching.id}
                  onClick={() => onAction(coaching.id, "approve")}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-70"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={actionId === coaching.id}
                  onClick={() => onAction(coaching.id, "reject")}
                  className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-70"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
