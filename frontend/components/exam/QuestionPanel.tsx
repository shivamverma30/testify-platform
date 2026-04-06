import Image from "next/image";
import type { ExamQuestion, OptionChoice } from "@/lib/api";

type QuestionPanelProps = {
  question: ExamQuestion;
  selectedOption: OptionChoice | null;
  onSelectOption: (option: OptionChoice) => void;
};

const optionLabels: OptionChoice[] = ["A", "B", "C", "D"];

export function QuestionPanel({ question, selectedOption, onSelectOption }: QuestionPanelProps) {
  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Question {question.question_number}</p>
        <p className="text-xs text-slate-300">
          {question.subject} · {question.topic}
        </p>
      </div>

      <p className="mt-4 text-base leading-7 text-white md:text-lg">{question.question_text}</p>

      {question.question_image_url ? (
        <Image
          src={question.question_image_url}
          alt={`Question ${question.question_number}`}
          width={1200}
          height={700}
          className="mt-4 max-h-72 w-full rounded-xl border border-white/10 object-contain"
        />
      ) : null}

      <div className="mt-6 grid gap-3">
        {optionLabels.map((label) => {
          const checked = selectedOption === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelectOption(label)}
              className={`group flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                checked
                  ? "border-indigo-300/70 bg-indigo-500/25 text-white shadow-lg shadow-indigo-500/10"
                  : "border-white/15 bg-white/5 text-slate-100 hover:border-cyan-300/50 hover:bg-white/10"
              }`}
            >
              <span
                className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                  checked
                    ? "border-indigo-200 bg-indigo-500 text-white"
                    : "border-white/30 text-slate-300 group-hover:border-cyan-300/70"
                }`}
              >
                {label}
              </span>
              <span className="text-sm md:text-base">{question.options[label]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
