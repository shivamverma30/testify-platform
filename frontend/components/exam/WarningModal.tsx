type WarningModalProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export function WarningModal({ open, title, message, onClose }: WarningModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-amber-300/40 bg-slate-900 p-5 shadow-2xl">
        <h2 className="font-display text-2xl text-amber-100">{title}</h2>
        <p className="mt-2 text-sm text-slate-200">{message}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-amber-300/40 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/30"
          >
            Continue Exam
          </button>
        </div>
      </div>
    </div>
  );
}
