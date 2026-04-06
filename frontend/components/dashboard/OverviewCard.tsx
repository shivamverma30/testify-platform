import type { ReactNode } from "react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

type OverviewCardProps = {
  title: string;
  value: number;
  icon: ReactNode;
  subtitle: string;
  tone?: "blue" | "green" | "amber";
};

const toneClasses: Record<NonNullable<OverviewCardProps["tone"]>, string> = {
  blue: "from-indigo-500/90 to-cyan-400/90",
  green: "from-emerald-500/90 to-cyan-400/90",
  amber: "from-cyan-500/90 to-indigo-500/90",
};

export function OverviewCard({
  title,
  value,
  icon,
  subtitle,
  tone = "blue",
}: OverviewCardProps) {
  return (
    <article className="glass-card hover-lift group relative overflow-hidden rounded-2xl p-6 page-enter">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r ${toneClasses[tone]}`}
      />
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-cyan-200 transition-colors group-hover:bg-white/20">
          {icon}
        </span>
      </div>
      <p className="font-display text-3xl font-semibold tracking-tight text-white">
        <AnimatedCounter value={value} />
      </p>
      <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
    </article>
  );
}
