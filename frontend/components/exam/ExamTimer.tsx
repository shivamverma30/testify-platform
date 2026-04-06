type ExamTimerProps = {
  secondsLeft: number;
  isDanger?: boolean;
};

const pad = (value: number) => String(value).padStart(2, "0");

export function formatTimer(secondsLeft: number) {
  const total = Math.max(0, Math.floor(secondsLeft));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function ExamTimer({ secondsLeft, isDanger = false }: ExamTimerProps) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-center font-mono text-base font-semibold tracking-widest md:text-lg ${
        isDanger
          ? "border-rose-300/50 bg-rose-500/15 text-rose-100"
          : "border-cyan-200/30 bg-cyan-500/10 text-cyan-100"
      }`}
    >
      {formatTimer(secondsLeft)}
    </div>
  );
}
