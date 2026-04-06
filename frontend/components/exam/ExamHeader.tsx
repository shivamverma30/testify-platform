import { ExamTimer } from "./ExamTimer";

type ExamHeaderProps = {
  testName: string;
  totalQuestions: number;
  secondsLeft: number;
  onSubmitClick: () => void;
  isSubmitting: boolean;
};

export function ExamHeader({
  testName,
  totalQuestions,
  secondsLeft,
  onSubmitClick,
  isSubmitting,
}: ExamHeaderProps) {
  const isDanger = secondsLeft <= 300;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">CBT Exam</p>
          <h1 className="font-display mt-1 text-lg text-white md:text-2xl">{testName}</h1>
          <p className="mt-1 text-xs text-slate-300 md:text-sm">{totalQuestions} Questions</p>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <ExamTimer secondsLeft={secondsLeft} isDanger={isDanger} />
          <button
            type="button"
            onClick={onSubmitClick}
            disabled={isSubmitting}
            className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit Exam"}
          </button>
        </div>
      </div>
    </header>
  );
}
