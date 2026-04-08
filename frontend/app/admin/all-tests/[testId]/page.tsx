"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  addQuestionToSection,
  getAdminTestDetail,
  getQuestions,
  removeQuestionFromSection,
  updateQuestion,
  type AdminTestDetail,
  type QuestionItem,
} from "@/lib/api";

type QuestionDraft = {
  subject: string;
  topic: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  marks: number;
  negative_marks: number;
  difficulty: "easy" | "medium" | "hard";
};

const formatSchedule = (start: string | null, end: string | null) => {
  if (!start || !end) {
    return "Not scheduled";
  }

  return `${new Date(start).toLocaleString("en-IN")} - ${new Date(end).toLocaleString("en-IN")}`;
};

export default function AdminTestDetailPage() {
  const params = useParams<{ testId: string }>();
  const testId = Array.isArray(params?.testId) ? params.testId[0] : params?.testId;

  const [testDetail, setTestDetail] = useState<AdminTestDetail | null>(null);
  const [questionBank, setQuestionBank] = useState<QuestionItem[]>([]);
  const [selectedQuestionBySection, setSelectedQuestionBySection] = useState<Record<string, string>>({});

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mappedQuestionIds = useMemo(() => {
    if (!testDetail) {
      return new Set<string>();
    }

    return new Set(
      testDetail.sections.flatMap((section) => section.questions.map((question) => question.id)),
    );
  }, [testDetail]);

  const loadTestDetail = async () => {
    if (!testId) {
      return;
    }

    const payload = await getAdminTestDetail(testId);
    setTestDetail(payload);
  };

  const loadQuestionBank = async () => {
    const payload = await getQuestions({ sort: "newest" });
    setQuestionBank(payload);
  };

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (!testId) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [detailPayload, bankPayload] = await Promise.all([
          getAdminTestDetail(testId),
          getQuestions({ sort: "newest" }),
        ]);

        if (ignore) {
          return;
        }

        setTestDetail(detailPayload);
        setQuestionBank(bankPayload);
      } catch (requestError) {
        if (ignore) {
          return;
        }

        const message = requestError instanceof Error ? requestError.message : "Unable to load test details.";
        setError(message);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [testId]);

  const startEditing = (question: AdminTestDetail["sections"][number]["questions"][number]) => {
    setEditingQuestionId(question.id);
    setQuestionDraft({
      subject: question.subject,
      topic: question.topic,
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_option: question.correct_option,
      marks: question.marks,
      negative_marks: question.negative_marks,
      difficulty: question.difficulty,
    });
  };

  const saveQuestionEdit = async () => {
    if (!editingQuestionId || !questionDraft) {
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      await updateQuestion(editingQuestionId, {
        subject: questionDraft.subject,
        topic: questionDraft.topic,
        question_text: questionDraft.question_text,
        option_a: questionDraft.option_a,
        option_b: questionDraft.option_b,
        option_c: questionDraft.option_c,
        option_d: questionDraft.option_d,
        correct_option: questionDraft.correct_option,
        marks: Math.max(1, Math.trunc(questionDraft.marks)),
        negative_marks: Math.max(0, Number(questionDraft.negative_marks)),
        difficulty: questionDraft.difficulty,
      });

      await loadTestDetail();
      setSuccess("Question updated successfully.");
      setEditingQuestionId(null);
      setQuestionDraft(null);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to update question.";
      setError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const removeQuestion = async (sectionId: string, questionId: string) => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      await removeQuestionFromSection(sectionId, questionId);
      await loadTestDetail();
      setSuccess("Question removed from test section.");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to remove question.";
      setError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const addQuestion = async (sectionId: string) => {
    const questionId = selectedQuestionBySection[sectionId];

    if (!questionId) {
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      await addQuestionToSection(sectionId, { question_id: questionId });
      await loadTestDetail();
      setSelectedQuestionBySection((current) => ({ ...current, [sectionId]: "" }));
      setSuccess("Question added to section.");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to add question to section.";
      setError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-slate-300">Loading test details...</p>;
  }

  if (!testDetail) {
    return (
      <section className="space-y-4 page-enter">
        <p className="text-sm text-rose-200">Test details are unavailable.</p>
        <Link href="/admin/all-tests" className="text-sm text-cyan-100 hover:text-white">
          Back to All Tests
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6 page-enter">
      <header className="space-y-2">
        <Link href="/admin/all-tests" className="text-sm text-cyan-100 hover:text-white">
          Back to All Tests
        </Link>
        <h2 className="font-display text-3xl text-white">{testDetail.title}</h2>
        <p className="text-sm text-slate-300">
          {testDetail.subject || "General"} · {testDetail.topic || "General"} · {testDetail.difficulty || "mixed"}
        </p>
        <p className="text-sm text-slate-300">
          {testDetail.type.replace("_", " ")} · {testDetail.total_questions} questions · {testDetail.duration_minutes} mins
        </p>
        <p className="text-sm text-slate-300">Schedule: {formatSchedule(testDetail.scheduled_start, testDetail.scheduled_end)}</p>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {success}
        </div>
      ) : null}

      {testDetail.sections.map((section) => {
        const availableQuestions = questionBank.filter((item) => !mappedQuestionIds.has(item.id));

        return (
          <section key={section.id} className="glass-card rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="font-display text-xl text-white">{section.title}</h3>
              <p className="text-sm text-slate-300">
                {section.question_count} questions · {section.duration_minutes} mins
              </p>
            </div>

            <div className="grid gap-3">
              {section.questions.map((question) => (
                <article key={question.id} className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-slate-100">
                  {editingQuestionId === question.id && questionDraft ? (
                    <div className="space-y-3">
                      <textarea
                        className="min-h-24 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5"
                        value={questionDraft.question_text}
                        onChange={(event) =>
                          setQuestionDraft((current) => (current ? { ...current, question_text: event.target.value } : current))
                        }
                      />
                      <div className="grid gap-2 md:grid-cols-2">
                        <input
                          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2"
                          value={questionDraft.option_a}
                          onChange={(event) =>
                            setQuestionDraft((current) => (current ? { ...current, option_a: event.target.value } : current))
                          }
                        />
                        <input
                          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2"
                          value={questionDraft.option_b}
                          onChange={(event) =>
                            setQuestionDraft((current) => (current ? { ...current, option_b: event.target.value } : current))
                          }
                        />
                        <input
                          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2"
                          value={questionDraft.option_c}
                          onChange={(event) =>
                            setQuestionDraft((current) => (current ? { ...current, option_c: event.target.value } : current))
                          }
                        />
                        <input
                          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2"
                          value={questionDraft.option_d}
                          onChange={(event) =>
                            setQuestionDraft((current) => (current ? { ...current, option_d: event.target.value } : current))
                          }
                        />
                        <select
                          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2"
                          value={questionDraft.correct_option}
                          onChange={(event) =>
                            setQuestionDraft((current) =>
                              current
                                ? { ...current, correct_option: event.target.value as QuestionDraft["correct_option"] }
                                : current,
                            )
                          }
                        >
                          <option value="A">Correct A</option>
                          <option value="B">Correct B</option>
                          <option value="C">Correct C</option>
                          <option value="D">Correct D</option>
                        </select>
                        <select
                          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2"
                          value={questionDraft.difficulty}
                          onChange={(event) =>
                            setQuestionDraft((current) =>
                              current ? { ...current, difficulty: event.target.value as QuestionDraft["difficulty"] } : current,
                            )
                          }
                        >
                          <option value="easy">easy</option>
                          <option value="medium">medium</option>
                          <option value="hard">hard</option>
                        </select>
                        <input
                          type="number"
                          min={1}
                          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2"
                          value={questionDraft.marks}
                          onChange={(event) =>
                            setQuestionDraft((current) =>
                              current ? { ...current, marks: Number(event.target.value) } : current,
                            )
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2"
                          value={questionDraft.negative_marks}
                          onChange={(event) =>
                            setQuestionDraft((current) =>
                              current ? { ...current, negative_marks: Number(event.target.value) } : current,
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => void saveQuestionEdit()}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs text-white hover:bg-emerald-400 disabled:opacity-70"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuestionId(null);
                            setQuestionDraft(null);
                          }}
                          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-white">{question.question_text}</p>
                      <ul className="mt-2 space-y-1 text-slate-200">
                        <li>A. {question.option_a}</li>
                        <li>B. {question.option_b}</li>
                        <li>C. {question.option_c}</li>
                        <li>D. {question.option_d}</li>
                      </ul>
                      <p className="mt-2 text-xs text-cyan-100">
                        {question.subject} · {question.topic} · {question.difficulty} · marks {question.marks} · negative {question.negative_marks}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(question)}
                          className="rounded-lg border border-white/25 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => void removeQuestion(section.id, question.id)}
                          className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs text-white hover:bg-rose-400 disabled:opacity-70"
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>

            <div className="rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="text-sm text-slate-200">Add more questions from question bank</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <select
                  className="min-w-[320px] rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm"
                  value={selectedQuestionBySection[section.id] || ""}
                  onChange={(event) =>
                    setSelectedQuestionBySection((current) => ({
                      ...current,
                      [section.id]: event.target.value,
                    }))
                  }
                >
                  <option value="">Select a question</option>
                  {availableQuestions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.subject} · {item.topic} · {item.difficulty} · {item.questionText.slice(0, 80)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isUpdating || !selectedQuestionBySection[section.id]}
                  onClick={() => void addQuestion(section.id)}
                  className="rounded-lg bg-indigo-500 px-3 py-2 text-xs text-white hover:bg-indigo-400 disabled:opacity-70"
                >
                  Add Question
                </button>
              </div>
            </div>
          </section>
        );
      })}

      <button
        type="button"
        disabled={isUpdating}
        onClick={() => {
          setError(null);
          setSuccess(null);
          void Promise.all([loadTestDetail(), loadQuestionBank()]);
        }}
        className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 disabled:opacity-70"
      >
        Refresh Test Details
      </button>
    </section>
  );
}
