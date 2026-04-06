type ExamFooterProps = {
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onSaveAndNext: () => void;
  onMarkForReview: () => void;
  onClear: () => void;
  busy: boolean;
};

export function ExamFooter({
  canGoPrevious,
  canGoNext,
  onPrevious,
  onSaveAndNext,
  onMarkForReview,
  onClear,
  busy,
}: ExamFooterProps) {
  return (
    <footer className="sticky bottom-0 z-20 mt-4 border-t border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious || busy}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onSaveAndNext}
          disabled={busy}
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {canGoNext ? "Save & Next" : "Save"}
        </button>
        <button
          type="button"
          onClick={onMarkForReview}
          disabled={busy}
          className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark for Review
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          className="rounded-xl border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear Response
        </button>
      </div>
    </footer>
  );
}
