import type { StudentTest } from "@/lib/api";
import { TestCard } from "./TestCard";

type TestListProps = {
  tests: StudentTest[];
  loading: boolean;
  error: string | null;
  mode: "available" | "upcoming";
  emptyTitle: string;
  emptyDescription: string;
};

export function TestList({
  tests,
  loading,
  error,
  mode,
  emptyTitle,
  emptyDescription,
}: TestListProps) {
  if (loading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-2xl border border-white/10 bg-linear-to-r from-slate-900/70 to-slate-800/70"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-300/40 bg-rose-500/12 p-5 text-rose-100">
        <p className="font-medium">Unable to load tests</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  if (!tests.length) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <h3 className="font-display text-lg font-semibold text-white">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-slate-300">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {tests.map((test) => (
        <TestCard key={test.id} test={test} mode={mode} />
      ))}
    </div>
  );
}
