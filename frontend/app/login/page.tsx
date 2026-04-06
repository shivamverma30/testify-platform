"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentAuthRole, getRoleDefaultRoute, hasAuthToken, login, type UserRole } from "@/lib/api";

type PublicRole = Exclude<UserRole, "super_admin">;

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<PublicRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasAuthToken()) {
      const activeRole = getCurrentAuthRole();

      if (activeRole) {
        router.replace(getRoleDefaultRoute(activeRole));
        return;
      }

      router.replace("/login");
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password, role);
      router.push(getRoleDefaultRoute(result.user.role));
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Login failed. Please check your credentials.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-10">
      <section className="grid w-full gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <p className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100">
            Role Based Access
          </p>
          <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
            Welcome back to Testify.
          </h1>
          <p className="max-w-lg text-slate-300">
            Continue your NIMCET prep journey with timed simulations, analytics, and precision feedback.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 md:p-8">
          <h2 className="font-display text-2xl text-white">Login</h2>
          <p className="mt-1 text-sm text-slate-300">Choose your role and continue.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/15 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  role === "student" ? "bg-indigo-500 text-white" : "text-slate-200 hover:bg-white/10"
                }`}
              >
                Login as Student
              </button>
              <button
                type="button"
                onClick={() => setRole("coaching_admin")}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  role === "coaching_admin" ? "bg-indigo-500 text-white" : "text-slate-200 hover:bg-white/10"
                }`}
              >
                Login as Coaching Institute
              </button>
            </div>

            <label className="block space-y-2">
              <span className="text-sm text-slate-200">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
                placeholder="student@testify.com"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-slate-200">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
                placeholder="••••••••"
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/12 px-3 py-2 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="cta-shimmer w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-300">
            New student?{" "}
            <Link href="/register" className="font-semibold text-cyan-200 hover:text-cyan-100">
              Create account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
