type SubmitModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  summary: {
    total: number;
    answered: number;
    notAnswered: number;
    markedReview: number;
  };
};

export function SubmitModal({ open, onClose, onConfirm, submitting, summary }: SubmitModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-5 shadow-2xl">
        <h2 className="font-display text-2xl text-white">Submit Exam?</h2>
        <p className="mt-2 text-sm text-slate-300">Please review your attempt summary before final submission.</p>

        <div className="mt-4 grid gap-2 text-sm text-slate-200">
          <p>Total Questions: {summary.total}</p>
          <p>Answered: {summary.answered}</p>
          <p>Not Answered: {summary.notAnswered}</p>
          <p>Marked for Review: {summary.markedReview}</p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Confirm Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
