"use client";

import { useEffect, useState } from "react";
import {
  addQuestionToSection,
  createSection,
  createTest,
  getQuestions,
  type QuestionItem,
} from "@/lib/api";

type BuildMode = "question_bank" | "ai";

export default function CreateTestPage() {
  const [mode, setMode] = useState<BuildMode>("question_bank");
  const [testType, setTestType] = useState<"topic_wise" | "full_length">("topic_wise");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [testDuration, setTestDuration] = useState(60);
  const [marksPerQuestion, setMarksPerQuestion] = useState(4);
  const [negativeMarks, setNegativeMarks] = useState(1);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoadingQuestions(true);
      setError(null);

      try {
        const result = await getQuestions({
          subject: subject || undefined,
          topic: topic || undefined,
          sort: "newest",
        });
        setQuestions(result);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "Unable to load question bank.";
        setError(message);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    if (mode === "question_bank") {
      void loadQuestions();
    }
  }, [mode, subject, topic]);

  const maxAllowedQuestions = 70;
  const canSelectMore = selectedQuestionIds.length < Math.min(numberOfQuestions, maxAllowedQuestions);

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds((current) => {
      if (current.includes(questionId)) {
        return current.filter((id) => id !== questionId);
      }

      if (!canSelectMore) {
        return current;
      }

      return [...current, questionId];
    });
  };

  const submitQuestionBankBuild = async () => {
    if (!title.trim()) {
      throw new Error("Test name is required.");
    }

    if (numberOfQuestions <= 0 || numberOfQuestions > maxAllowedQuestions) {
      throw new Error("number_of_questions must be between 1 and 70.");
    }

    if (selectedQuestionIds.length !== numberOfQuestions) {
      throw new Error(`Please select exactly ${numberOfQuestions} questions.`);
    }

    const createdTest = await createTest({
      title,
      test_type: testType,
      duration_minutes: testDuration,
      total_marks: numberOfQuestions * marksPerQuestion,
    });

    const section = await createSection(createdTest.id, {
      title: topic ? `${subject || "General"} - ${topic}` : subject || "General Section",
      order_index: 1,
    });

    for (const questionId of selectedQuestionIds) {
      await addQuestionToSection(section.id, {
        question_id: questionId,
      });
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "ai") {
      return;
    }

    setIsSubmitting(true);

    try {
      await submitQuestionBankBuild();
      setSuccess("Test created successfully with selected question bank questions.");
      setSelectedQuestionIds([]);
      setTitle("");
      setSubject("");
      setTopic("");
      setNumberOfQuestions(10);
      setTestDuration(60);
      setMarksPerQuestion(4);
      setNegativeMarks(1);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to create test.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Create Test</p>
        <h2 className="font-display mt-1 text-3xl text-white">Build New Test</h2>
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("question_bank")}
          className={`rounded-xl px-4 py-2 text-sm transition ${
            mode === "question_bank"
              ? "bg-indigo-500 text-white"
              : "border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
          }`}
        >
          Create Test With Question Bank
        </button>
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={`rounded-xl px-4 py-2 text-sm transition ${
            mode === "ai"
              ? "bg-indigo-500 text-white"
              : "border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
          }`}
        >
          Create Test With AI
        </button>
      </div>

      {mode === "ai" ? (
        <section className="glass-card rounded-2xl p-6">
          <h3 className="font-display text-xl text-white">AI Test Generation</h3>
          <p className="mt-2 text-sm text-slate-300">
            AI Test Generation will be available in a future update.
          </p>
        </section>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <section className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-xl text-white">Test Configuration</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                placeholder="Test Name"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
              <select
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                value={testType}
                onChange={(event) => setTestType(event.target.value as "topic_wise" | "full_length")}
              >
                <option value="topic_wise">Topic Wise Test</option>
                <option value="full_length">Full Length Test</option>
              </select>
              <input
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                placeholder="Subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
              <input
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                placeholder="Topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
              />
              <input
                type="number"
                min={1}
                max={70}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                placeholder="number_of_questions"
                value={numberOfQuestions}
                onChange={(event) => setNumberOfQuestions(Math.min(maxAllowedQuestions, Number(event.target.value)))}
                required
              />
              <input
                type="number"
                min={1}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                placeholder="test_duration"
                value={testDuration}
                onChange={(event) => setTestDuration(Number(event.target.value))}
                required
              />
              <input
                type="number"
                min={1}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                placeholder="marks_per_question"
                value={marksPerQuestion}
                onChange={(event) => setMarksPerQuestion(Number(event.target.value))}
                required
              />
              <input
                type="number"
                min={0}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                placeholder="negative_marks"
                value={negativeMarks}
                onChange={(event) => setNegativeMarks(Number(event.target.value))}
                required
              />
            </div>
            <p className="mt-3 text-xs text-slate-300">
              Max allowed questions per test: {maxAllowedQuestions}. Select exactly {numberOfQuestions} question(s).
            </p>
          </section>

          <section className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-white">Select Questions</h3>
              <p className="text-sm text-slate-300">Selected: {selectedQuestionIds.length}/{numberOfQuestions}</p>
            </div>

            {isLoadingQuestions ? <p className="mt-3 text-sm text-slate-300">Loading question bank...</p> : null}

            {!isLoadingQuestions ? (
              <div className="mt-4 grid gap-3">
                {questions.map((question) => {
                  const selected = selectedQuestionIds.includes(question.id);

                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => toggleQuestionSelection(question.id)}
                      className={`rounded-xl border p-3 text-left text-sm transition ${
                        selected
                          ? "border-cyan-300 bg-cyan-500/10 text-white"
                          : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      <p className="text-white">{question.questionText}</p>
                      <p className="mt-1 text-xs text-slate-300">
                        {question.subject} · {question.topic} · {question.difficulty} · marks {question.marks} · negative {question.negativeMarks}
                      </p>
                    </button>
                  );
                })}
                {!questions.length ? <p className="text-sm text-slate-300">No questions found for current filters.</p> : null}
              </div>
            ) : null}
          </section>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-70"
          >
            {isSubmitting ? "Creating Test..." : "Create Test"}
          </button>
        </form>
      )}
    </section>
  );
}
