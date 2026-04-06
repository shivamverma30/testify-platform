"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  addQuestion,
  bulkUploadQuestions,
  deleteQuestion,
  getQuestions,
  type QuestionItem,
  type QuestionPayload,
  updateQuestion,
} from "@/lib/api";

const initialForm: QuestionPayload = {
  subject: "",
  topic: "",
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "A",
  marks: 4,
  negative_marks: 1,
  difficulty: "easy",
};

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<QuestionPayload>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [topicSearch, setTopicSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const [uploadSummary, setUploadSummary] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getQuestions({
        topic: topicSearch || undefined,
        difficulty: difficultyFilter === "all" ? undefined : difficultyFilter,
        sort: sortOrder,
      });
      setQuestions(result);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to load questions.";
      setError(message);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [topicSearch, difficultyFilter, sortOrder]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (editingId) {
        await updateQuestion(editingId, form);
      } else {
        await addQuestion(form);
      }
      resetForm();
      await loadQuestions();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to save question.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const onEdit = (question: QuestionItem) => {
    setEditingId(question.id);
    setForm({
      subject: question.subject,
      topic: question.topic,
      question_text: question.questionText,
      option_a: question.optionA,
      option_b: question.optionB,
      option_c: question.optionC,
      option_d: question.optionD,
      correct_option: question.correctOption,
      marks: question.marks,
      negative_marks: question.negativeMarks,
      difficulty: question.difficulty,
    });
  };

  const onDelete = async (questionId: string) => {
    setError(null);

    try {
      await deleteQuestion(questionId);
      setQuestions((current) => current.filter((item) => item.id !== questionId));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to delete question.";
      setError(message);
    }
  };

  const onFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    setUploadSummary(null);
    setError(null);

    try {
      const result = await bulkUploadQuestions(file);
      setUploadSummary(`Uploaded: ${result.uploaded}, Failed: ${result.failed}`);
      await loadQuestions();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Bulk upload failed.";
      setError(message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const filteredCountLabel = useMemo(() => `${questions.length} questions found`, [questions.length]);

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Question Bank</p>
        <h2 className="font-display mt-1 text-3xl text-white">Manage Coaching Questions</h2>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl text-white">Bulk Upload Questions</h3>
          <label className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 cursor-pointer">
            {isUploading ? "Uploading..." : "Upload CSV/XLSX"}
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={onFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
        {uploadSummary ? <p className="mt-3 text-sm text-emerald-200">{uploadSummary}</p> : null}
      </section>

      <section className="glass-card rounded-2xl p-5">
        <h3 className="font-display text-xl text-white">{editingId ? "Edit Question" : "Add Question"}</h3>
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm" placeholder="Subject" value={form.subject} onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))} required />
          <input className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm" placeholder="Topic" value={form.topic} onChange={(e) => setForm((current) => ({ ...current, topic: e.target.value }))} required />
          <textarea className="md:col-span-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm" placeholder="Question text" value={form.question_text} onChange={(e) => setForm((current) => ({ ...current, question_text: e.target.value }))} required />
          <input className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm" placeholder="Option A" value={form.option_a} onChange={(e) => setForm((current) => ({ ...current, option_a: e.target.value }))} required />
          <input className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm" placeholder="Option B" value={form.option_b} onChange={(e) => setForm((current) => ({ ...current, option_b: e.target.value }))} required />
          <input className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm" placeholder="Option C" value={form.option_c} onChange={(e) => setForm((current) => ({ ...current, option_c: e.target.value }))} required />
          <input className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm" placeholder="Option D" value={form.option_d} onChange={(e) => setForm((current) => ({ ...current, option_d: e.target.value }))} required />
          <select className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm" value={form.correct_option} onChange={(e) => setForm((current) => ({ ...current, correct_option: e.target.value as "A" | "B" | "C" | "D" }))}>
            <option value="A">Correct Option: A</option>
            <option value="B">Correct Option: B</option>
            <option value="C">Correct Option: C</option>
            <option value="D">Correct Option: D</option>
          </select>
          <select className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm" value={form.difficulty} onChange={(e) => setForm((current) => ({ ...current, difficulty: e.target.value as "easy" | "medium" | "hard" }))}>
            <option value="easy">Difficulty: Easy</option>
            <option value="medium">Difficulty: Medium</option>
            <option value="hard">Difficulty: Hard</option>
          </select>
          <input type="number" min={1} className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm" placeholder="Marks" value={form.marks} onChange={(e) => setForm((current) => ({ ...current, marks: Number(e.target.value) }))} required />
          <input type="number" min={0} className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm" placeholder="Negative Marks" value={form.negative_marks} onChange={(e) => setForm((current) => ({ ...current, negative_marks: Number(e.target.value) }))} required />

          <div className="md:col-span-2 flex gap-2">
            <button type="submit" disabled={isSaving} className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-70">
              {isSaving ? "Saving..." : editingId ? "Update Question" : "Add Question"}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            placeholder="Search by topic"
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
            value={topicSearch}
            onChange={(e) => setTopicSearch(e.target.value)}
          />
          <select
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as "all" | "easy" | "medium" | "hard")}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <button
            type="button"
            onClick={() => void loadQuestions()}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10"
          >
            Apply Filters
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-300">{filteredCountLabel}</p>

        {isLoading ? <p className="mt-3 text-sm text-slate-300">Loading questions...</p> : null}

        {!isLoading ? (
          <div className="mt-4 space-y-3">
            {questions.map((question) => (
              <article key={question.id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="text-sm text-white">{question.questionText}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {question.subject} · {question.topic} · {question.difficulty} · marks {question.marks}
                </p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => onEdit(question)} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs text-white hover:bg-indigo-400">Edit</button>
                  <button type="button" onClick={() => void onDelete(question.id)} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs text-white hover:bg-rose-400">Delete</button>
                </div>
              </article>
            ))}
            {!questions.length ? <p className="text-sm text-slate-300">No questions found.</p> : null}
          </div>
        ) : null}
      </section>
    </section>
  );
}
