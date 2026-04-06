"use client";

import { FormEvent, useEffect, useState } from "react";
import { useStudentStore } from "@/store/studentStore";

export default function StudentProfilePage() {
  const {
    profile,
    isLoadingProfile,
    profileError,
    fetchProfile,
    saveProfile,
  } = useStudentStore();

  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
    examPreparingFor: "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const resolvedName = form.name || profile?.name || "";
    const resolvedPhone = form.phoneNumber || profile?.phone_number || "";
    const resolvedExam = form.examPreparingFor || profile?.exam_preparing_for || "";

    try {
      await saveProfile({
        name: resolvedName,
        phone_number: resolvedPhone,
        exam_preparing_for: resolvedExam,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
      });

      setCurrentPassword("");
      setNewPassword("");
      setMessage("Profile updated successfully.");
    } catch {
      setMessage(null);
    }
  };

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">Profile</h1>
      </header>

      {profileError ? (
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/12 p-5 text-rose-100">
          <p className="font-medium">Unable to process profile request</p>
          <p className="mt-1 text-sm">{profileError}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-2xl p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-200">Student Name</label>
            <input
              value={form.name || profile?.name || ""}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-200">Phone Number</label>
            <input
              value={form.phoneNumber || profile?.phone_number || ""}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  phoneNumber: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-200">Exam Preparing For</label>
            <input
              value={form.examPreparingFor || profile?.exam_preparing_for || ""}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  examPreparingFor: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-200">Coaching Institute</label>
            <input
              value={profile?.coaching_name || ""}
              disabled
              className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-slate-300 outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-200">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-200">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
            />
          </div>
        </div>

        {message ? (
          <p className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoadingProfile}
          className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingProfile ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </section>
  );
}
