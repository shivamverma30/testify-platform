"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStudentProfile,
  getStudents,
  ApiError,
  approveStudent,
  rejectStudent,
  type AdminStudent,
  type AdminStudentProfile,
  type StudentStatus,
} from "@/lib/api";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [status, setStatus] = useState<StudentStatus>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<AdminStudentProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const canApproveOrReject = status === "pending";

  const fetchPendingStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getStudents(status);
      setStudents(result);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to load pending students.";
      setError(message);
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void fetchPendingStudents();
  }, [fetchPendingStudents]);

  const openProfile = async (studentId: string) => {
    setIsProfileLoading(true);
    setError(null);

    try {
      const profile = await getStudentProfile(studentId);
      setSelectedProfile(profile);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to load student profile.";
      setError(message);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const onAction = async (studentId: string, action: "approve" | "reject") => {
    setActionId(studentId);

    try {
      if (action === "approve") {
        await approveStudent(studentId);
      } else {
        await rejectStudent(studentId);
      }

      if (status === "pending") {
        setStudents((current) => current.filter((item) => item.id !== studentId));
      } else {
        void fetchPendingStudents();
      }
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
    <section className="space-y-5">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Management</p>
        <h2 className="font-display mt-1 text-3xl text-white">Manage Students</h2>
        <p className="mt-2 text-sm text-slate-300">
          Review students for your coaching institute, filter by status, and view profile details.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {([
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
        ] as const).map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setStatus(item.value)}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              status === item.value
                ? "bg-indigo-500 text-white"
                : "border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
          Loading pending students...
        </div>
      ) : null}

      {!isLoading && students.length === 0 ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-sm text-emerald-100">
          No students found for this status.
        </div>
      ) : null}

      {!isLoading && students.length > 0 ? (
        <div className="space-y-3">
          {students.map((student) => (
            <article
              key={student.id}
              className="glass-card flex flex-col gap-4 rounded-2xl p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-display text-lg text-white">{student.name}</p>
                <p className="text-sm text-slate-300">{student.user.email}</p>
                <p className="text-sm text-slate-300">
                  {student.phoneNumber} · {student.examPreparingFor}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-cyan-200">{student.status}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openProfile(student.id)}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  View Profile
                </button>
                {canApproveOrReject ? (
                  <>
                    <button
                      type="button"
                      disabled={actionId === student.id}
                      onClick={() => onAction(student.id, "approve")}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-70"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={actionId === student.id}
                      onClick={() => onAction(student.id, "reject")}
                      className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-70"
                    >
                      Reject
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {(selectedProfile || isProfileLoading) ? (
        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-white">Student Profile</h3>
            <button
              type="button"
              onClick={() => setSelectedProfile(null)}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1 text-xs text-slate-100 hover:bg-white/10"
            >
              Close
            </button>
          </div>
          {isProfileLoading ? <p className="mt-3 text-sm text-slate-300">Loading profile...</p> : null}
          {selectedProfile ? (
            <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-2">
              <p><span className="text-slate-400">Name:</span> {selectedProfile.name}</p>
              <p><span className="text-slate-400">Email:</span> {selectedProfile.email || "N/A"}</p>
              <p><span className="text-slate-400">Phone:</span> {selectedProfile.phone_number}</p>
              <p><span className="text-slate-400">Exam:</span> {selectedProfile.exam_preparing_for}</p>
              <p><span className="text-slate-400">Status:</span> {selectedProfile.status}</p>
              <p><span className="text-slate-400">Attempts:</span> {selectedProfile.stats.attempts}</p>
              <p><span className="text-slate-400">Results:</span> {selectedProfile.stats.results}</p>
              <p><span className="text-slate-400">Purchases:</span> {selectedProfile.stats.purchases}</p>
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
