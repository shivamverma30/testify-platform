"use client";

import { useEffect, useState } from "react";
import { getCoachingManagement, type CoachingManagementItem } from "@/lib/api";

export default function CoachingManagementPage() {
  const [items, setItems] = useState<CoachingManagementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getCoachingManagement();
        setItems(result);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "Unable to load coachings";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <section className="space-y-5 page-enter">
      <header>
        <p className="text-sm font-medium text-fuchsia-200">Coaching Management</p>
        <h2 className="font-display mt-1 text-3xl text-white">All Coaching Institutes</h2>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
          Loading coaching institutes...
        </div>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.2em] text-slate-300">
              <tr>
                <th className="px-4 py-3">Institute</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-white/10 last:border-b-0">
                  <td className="px-4 py-3">{item.instituteName}</td>
                  <td className="px-4 py-3">{item.adminName}</td>
                  <td className="px-4 py-3">{item.user.email}</td>
                  <td className="px-4 py-3 capitalize">{item.status.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
