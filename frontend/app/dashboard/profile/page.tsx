"use client";

import { FormEvent, useState } from "react";

export default function DashboardProfilePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [exam, setExam] = useState("NIMCET");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage("Profile update UI is ready. Connect this form to profile API when endpoint is available.");
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password must match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    setPasswordMessage("Change password UI is ready. Connect this form to auth password API when endpoint is available.");
  };

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">Profile</h1>
        <p className="mt-2 text-sm text-slate-300">Update profile information and change your password.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-card rounded-2xl p-6">
          <h2 className="font-display text-xl text-white">Update Profile</h2>
          <form className="mt-4 space-y-3" onSubmit={handleProfileSubmit}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
              placeholder="Full name"
            />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
              placeholder="Phone number"
            />
            <select
              value={exam}
              onChange={(event) => setExam(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
            >
              <option value="NIMCET">NIMCET</option>
            </select>

            {profileMessage ? (
              <p className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                {profileMessage}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Save Profile
            </button>
          </form>
        </section>

        <section className="glass-card rounded-2xl p-6">
          <h2 className="font-display text-xl text-white">Change Password</h2>
          <form className="mt-4 space-y-3" onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
              placeholder="Current password"
            />
            <input
              type="password"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
              placeholder="New password"
            />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-300"
              placeholder="Confirm new password"
            />

            {passwordError ? (
              <p className="rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {passwordError}
              </p>
            ) : null}
            {passwordMessage ? (
              <p className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                {passwordMessage}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Update Password
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}
