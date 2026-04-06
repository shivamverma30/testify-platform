"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getApprovedCoachingOptions,
  getCurrentAuthRole,
  getRoleDefaultRoute,
  hasAuthToken,
  registerCoachingInstitute,
  registerStudent,
  type ApprovedCoachingOption,
} from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "coaching_admin">("student");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [coachingId, setCoachingId] = useState("");
  const [examPreparingFor, setExamPreparingFor] = useState("NIMCET");
  const [coachingOptions, setCoachingOptions] = useState<ApprovedCoachingOption[]>([]);

  const [instituteName, setInstituteName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [isLoadingCoachings, setIsLoadingCoachings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchCoachingOptions = async () => {
      setIsLoadingCoachings(true);

      try {
        const options = await getApprovedCoachingOptions();
        setCoachingOptions(options);

        if (options.length > 0) {
          setCoachingId((current) => current || options[0].id);
        }
      } catch {
        setCoachingOptions([]);
      } finally {
        setIsLoadingCoachings(false);
      }
    };

    void fetchCoachingOptions();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (role === "student") {
        await registerStudent({
          name,
          email,
          password,
          selected_coaching_id: coachingId,
          phone: phoneNumber,
          exam_preparing_for: examPreparingFor,
        });

        setSuccess("Student registration submitted. Account remains pending until coaching admin approval.");
        setName("");
        setEmail("");
        setPassword("");
        setPhoneNumber("");
        setCoachingId("");
      } else {
        await registerCoachingInstitute({
          institute_name: instituteName,
          admin_name: adminName,
          email,
          phone: phoneNumber,
          password,
        });

        setSuccess("Coaching registration submitted. Awaiting super admin approval.");
        setInstituteName("");
        setAdminName("");
        setEmail("");
        setPassword("");
        setPhoneNumber("");
      }

      setTimeout(() => {
        router.push("/login");
      }, 900);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Registration failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-10">
      <section className="grid w-full gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <p className="inline-flex rounded-full border border-indigo-300/40 bg-indigo-500/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-indigo-100">
            Role Based Registration
          </p>
          <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
            Create your Testify account.
          </h1>
          <p className="max-w-lg text-slate-300">
            Join your coaching institute, unlock purchased test series, and start AI-powered mock prep.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 md:p-8">
          <h2 className="font-display text-2xl text-white">Register</h2>
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/15 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  role === "student" ? "bg-indigo-500 text-white" : "text-slate-200 hover:bg-white/10"
                }`}
              >
                Register as Student
              </button>
              <button
                type="button"
                onClick={() => setRole("coaching_admin")}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  role === "coaching_admin" ? "bg-indigo-500 text-white" : "text-slate-200 hover:bg-white/10"
                }`}
              >
                Register as Coaching Institute
              </button>
            </div>

            {role === "student" ? (
              <>
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
                  placeholder="Student name"
                />
                <input
                  required
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
                  placeholder="Phone"
                />
                <select
                  required
                  value={coachingId}
                  onChange={(event) => setCoachingId(event.target.value)}
                  disabled={isLoadingCoachings || coachingOptions.length === 0}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300 disabled:opacity-70"
                >
                  {isLoadingCoachings ? <option>Loading coaching institutes...</option> : null}
                  {!isLoadingCoachings && coachingOptions.length === 0 ? (
                    <option value="">No approved coaching institutes available</option>
                  ) : null}
                  {!isLoadingCoachings
                    ? coachingOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.instituteName}
                        </option>
                      ))
                    : null}
                </select>
                <select
                  value={examPreparingFor}
                  onChange={(event) => setExamPreparingFor(event.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
                >
                  <option value="NIMCET">NIMCET</option>
                </select>
              </>
            ) : (
              <>
                <input
                  required
                  value={instituteName}
                  onChange={(event) => setInstituteName(event.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
                  placeholder="Institute name"
                />
                <input
                  required
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
                  placeholder="Admin name"
                />
                <input
                  required
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
                  placeholder="Phone"
                />
              </>
            )}

            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
              placeholder="Email"
            />
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
              placeholder="Password"
            />
            {error ? (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/12 px-3 py-2 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-100">
                {success}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="cta-shimmer rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-300">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">
              Login here
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
