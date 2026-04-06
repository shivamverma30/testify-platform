import { CalendarClock, Clock3, Flag } from "lucide-react";
import type { StudentTest } from "@/lib/api";

type TestCardProps = {
  test: StudentTest;
  mode: "available" | "upcoming";
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export function TestCard({ test, mode }: TestCardProps) {
  return (
    <article className="glass-card hover-lift rounded-2xl p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div>
            <p className="mb-2 inline-flex rounded-full border border-cyan-200/40 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-100">
              {test.type.replace("_", " ")}
            </p>
            <h3 className="font-display text-xl font-semibold tracking-tight text-slate-100">
              {test.title}
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <Clock3 size={16} />
              {test.duration_minutes} mins
            </p>
            <p className="inline-flex items-center gap-2">
              <Flag size={16} />
              {test.total_marks} marks
            </p>
            <p className="inline-flex items-center gap-2 sm:col-span-2">
              <CalendarClock size={16} />
              {formatDate(test.scheduled_start)} to {formatDate(test.scheduled_end)}
            </p>
          </div>
        </div>

        {mode === "available" ? (
          <button
            type="button"
            className="cta-shimmer neon-ring inline-flex h-11 items-center justify-center rounded-xl bg-indigo-500 px-5 text-sm font-medium text-white transition-all hover:bg-indigo-400"
          >
            Start Test
          </button>
        ) : (
          <span className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-medium text-slate-300">
            Starts Soon
          </span>
        )}
      </div>
    </article>
  );
}
