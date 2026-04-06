type PaletteStatus = "not_visited" | "visited_unanswered" | "answered" | "marked_review";

type QuestionPaletteProps = {
  currentIndex: number;
  statuses: PaletteStatus[];
  onJump: (index: number) => void;
};

const statusClass: Record<PaletteStatus, string> = {
  not_visited: "border-white/20 bg-white/5 text-slate-300",
  visited_unanswered: "border-rose-300/50 bg-rose-500/20 text-rose-100",
  answered: "border-emerald-300/50 bg-emerald-500/20 text-emerald-100",
  marked_review: "border-violet-300/50 bg-violet-500/20 text-violet-100",
};

const legend = [
  { label: "Not Visited", key: "not_visited" as const },
  { label: "Visited", key: "visited_unanswered" as const },
  { label: "Answered", key: "answered" as const },
  { label: "Marked Review", key: "marked_review" as const },
];

export function QuestionPalette({ currentIndex, statuses, onJump }: QuestionPaletteProps) {
  return (
    <aside className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 md:sticky md:top-24 md:max-h-[calc(100vh-8rem)] md:overflow-auto">
      <h2 className="font-display text-lg text-white">Question Palette</h2>

      <div className="grid grid-cols-5 gap-2">
        {statuses.map((status, index) => {
          const isCurrent = index === currentIndex;
          return (
            <button
              key={index + 1}
              type="button"
              onClick={() => onJump(index)}
              className={`rounded-lg border px-2 py-2 text-center text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-lg ${statusClass[status]} ${
                isCurrent ? "ring-2 ring-cyan-300/70" : ""
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 text-xs">
        {legend.map((item) => (
          <div key={item.key} className="flex items-center gap-2 text-slate-200">
            <span className={`inline-block h-3 w-3 rounded-sm ${statusClass[item.key]}`} />
            {item.label}
          </div>
        ))}
      </div>
    </aside>
  );
}
