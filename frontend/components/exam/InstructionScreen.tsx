type InstructionScreenProps = {
  testName: string;
  totalQuestions: number;
  durationMinutes: number;
  positiveMarks: number;
  negativeMarks: number;
  loading: boolean;
  onStart: () => void;
  hasAttempt: boolean;
};

export function InstructionScreen({
  testName,
  totalQuestions,
  durationMinutes,
  positiveMarks,
  negativeMarks,
  loading,
  onStart,
  hasAttempt,
}: InstructionScreenProps) {
  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">Exam Instructions</h1>
      </header>

      <article className="glass-card rounded-3xl p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Test Name</p>
            <p className="mt-2 font-display text-xl text-white">{testName}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Total Questions</p>
            <p className="mt-2 font-display text-xl text-white">{totalQuestions}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Duration</p>
            <p className="mt-2 font-display text-xl text-white">{durationMinutes} Minutes</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Marking Scheme</p>
            <p className="mt-2 text-sm text-white">+{positiveMarks} for correct, -{negativeMarks} for wrong</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
          <ul className="space-y-2">
            <li>Do not refresh the page during the exam.</li>
            <li>Do not switch tabs or exit fullscreen mode.</li>
            <li>Answers are auto saved as soon as you select an option.</li>
            <li>Timer will auto submit your exam when it reaches zero.</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={loading}
          className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Starting..." : hasAttempt ? "Resume Exam" : "Start Exam"}
        </button>
      </article>
    </section>
  );
}
