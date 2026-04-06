"use client";

import { getCurrentAuthUser } from "@/lib/api";

export default function AdminProfilePage() {
  const auth = getCurrentAuthUser();

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Profile</p>
        <h2 className="font-display mt-1 text-3xl text-white">Coaching Admin Profile</h2>
      </header>

      <section className="glass-card rounded-2xl p-5">
        <h3 className="font-display text-xl text-white">Account Information</h3>
        <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-2">
          <p><span className="text-slate-400">User ID:</span> {auth?.userId || "N/A"}</p>
          <p><span className="text-slate-400">Role:</span> {auth?.role || "N/A"}</p>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <h3 className="font-display text-xl text-white">Institute Preferences</h3>
        <p className="mt-2 text-sm text-slate-300">
          Profile editing endpoints can be integrated here without changing the dashboard structure.
        </p>
      </section>
    </section>
  );
}
