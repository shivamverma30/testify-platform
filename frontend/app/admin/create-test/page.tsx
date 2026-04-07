"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addQuestionToSection,
  createAiGeneratedTest,
  createSection,
  createTest,
  generateAiFullTest,
  generateAiTopicTest,
  getQuestions,
  type AiCreatedTestResponse,
  type AiGeneratedQuestion,
  type QuestionItem,
} from "@/lib/api";

type BuildMode = "question_bank" | "ai";
type AiFlowMode = "topic" | "full" | null;
type DifficultyLevel = "easy" | "medium" | "hard";

type ReviewQuestion = AiGeneratedQuestion & {
  draft_id: string;
  approved: boolean;
  is_editing: boolean;
};

type ReviewSection = {
  section_name: string;
  subject: string;
  topic: string;
  duration_minutes: number;
  expected_question_count?: number;
  generated_question_count?: number;
  questions: ReviewQuestion[];
};

const SUBJECT_OPTIONS = [
  "Mathematics",
  "Analytical Ability & Logical Reasoning",
  "Computer Awareness & General English",
  "English",
];

const buildDraftId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const toReviewQuestion = (question: AiGeneratedQuestion): ReviewQuestion => ({
  ...question,
  draft_id: buildDraftId(),
  approved: Boolean(question.approved),
  is_editing: false,
});

const clampPositiveInteger = (value: number, minimum = 1, maximum?: number) => {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  const normalized = Math.trunc(value);
  const clampedToMinimum = normalized < minimum ? minimum : normalized;

  if (maximum === undefined) {
    return clampedToMinimum;
  }

  return clampedToMinimum > maximum ? maximum : clampedToMinimum;
};

const getCorrectAnswerText = (
  question: Pick<
    ReviewQuestion,
    "correct_option" | "option_a" | "option_b" | "option_c" | "option_d"
  >,
) => {
  if (question.correct_option === "A") return question.option_a;
  if (question.correct_option === "B") return question.option_b;
  if (question.correct_option === "C") return question.option_c;
  return question.option_d;
};

const toAiPayloadQuestion = (question: ReviewQuestion): AiGeneratedQuestion => ({
  subject: question.subject,
  topic: question.topic,
  question_text: question.question_text,
  option_a: question.option_a,
  option_b: question.option_b,
  option_c: question.option_c,
  option_d: question.option_d,
  correct_option: question.correct_option,
  correct_answer: getCorrectAnswerText(question),
  marks: question.marks,
  negative_marks: question.negative_marks,
  difficulty: question.difficulty,
  approved: question.approved,
});

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

  const [aiFlowMode, setAiFlowMode] = useState<AiFlowMode>(null);
  const [aiTitle, setAiTitle] = useState("");
  const [aiSubject, setAiSubject] = useState("Mathematics");
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(20);
  const [aiMarksPerQuestion, setAiMarksPerQuestion] = useState(4);
  const [aiNegativeMarking, setAiNegativeMarking] = useState(1);
  const [aiDifficulty, setAiDifficulty] = useState<DifficultyLevel>("medium");
  const [aiDuration, setAiDuration] = useState(60);

  const [topicReviewQuestions, setTopicReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [fullReviewSections, setFullReviewSections] = useState<ReviewSection[]>([]);

  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isCreatingAiTest, setIsCreatingAiTest] = useState(false);
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

  const topicApprovedCount = useMemo(
    () => topicReviewQuestions.filter((question) => question.approved).length,
    [topicReviewQuestions],
  );

  const fullApprovedCount = useMemo(
    () =>
      fullReviewSections.reduce(
        (sum, section) => sum + section.questions.filter((question) => question.approved).length,
        0,
      ),
    [fullReviewSections],
  );

  const fullGeneratedCount = useMemo(
    () => fullReviewSections.reduce((sum, section) => sum + section.questions.length, 0),
    [fullReviewSections],
  );

  const clearAiDrafts = () => {
    setTopicReviewQuestions([]);
    setFullReviewSections([]);
  };

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

  const updateTopicQuestion = (
    draftId: string,
    updater: (question: ReviewQuestion) => ReviewQuestion,
  ) => {
    setTopicReviewQuestions((current) =>
      current.map((question) => (question.draft_id === draftId ? updater(question) : question)),
    );
  };

  const updateFullQuestion = (
    sectionName: string,
    draftId: string,
    updater: (question: ReviewQuestion) => ReviewQuestion,
  ) => {
    setFullReviewSections((current) =>
      current.map((section) => {
        if (section.section_name !== sectionName) {
          return section;
        }

        return {
          ...section,
          questions: section.questions.map((question) =>
            question.draft_id === draftId ? updater(question) : question,
          ),
        };
      }),
    );
  };

  const updateTopicQuestionField = (
    draftId: string,
    field: keyof AiGeneratedQuestion,
    value: string | number | boolean,
  ) => {
    updateTopicQuestion(draftId, (question) => ({ ...question, [field]: value } as ReviewQuestion));
  };

  const updateFullQuestionField = (
    sectionName: string,
    draftId: string,
    field: keyof AiGeneratedQuestion,
    value: string | number | boolean,
  ) => {
    updateFullQuestion(sectionName, draftId, (question) => ({ ...question, [field]: value } as ReviewQuestion));
  };

  const openTopicAiForm = () => {
    setAiFlowMode("topic");
    setError(null);
    setSuccess(null);
    setFullReviewSections([]);
  };

  const onGenerateTopicAiQuestions = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!aiTopic.trim()) {
      setError("Topic is required to generate a topic wise AI test.");
      return;
    }

    setIsGeneratingAi(true);

    try {
      const response = await generateAiTopicTest({
        subject: aiSubject,
        topic: aiTopic.trim(),
        question_count: clampPositiveInteger(aiQuestionCount, 1, 70),
        marks: clampPositiveInteger(aiMarksPerQuestion, 1, 20),
        negative_marks: clampPositiveInteger(aiNegativeMarking, 0, 20),
        difficulty: aiDifficulty,
        duration: clampPositiveInteger(aiDuration, 1, 500),
      });

      const reviewQuestions = response.questions.map(toReviewQuestion);

      setAiFlowMode("topic");
      setTopicReviewQuestions(reviewQuestions);
      setFullReviewSections([]);

      if (!aiTitle.trim()) {
        setAiTitle(`${response.subject} - ${response.topic} AI Test`);
      }

      setSuccess(`Generated ${reviewQuestions.length} AI question(s). Review and approve before creating the test.`);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unable to generate topic wise AI questions.";
      setError(message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const onGenerateFullLengthAiTest = async () => {
    setError(null);
    setSuccess(null);
    setAiFlowMode("full");
    setIsGeneratingAi(true);

    try {
      const response = await generateAiFullTest({
        marks: clampPositiveInteger(aiMarksPerQuestion, 1, 20),
        negative_marks: clampPositiveInteger(aiNegativeMarking, 0, 20),
        difficulty: aiDifficulty,
      });

      const sections: ReviewSection[] = response.sections.map((section) => ({
        section_name: section.section_name,
        subject: section.subject,
        topic: section.topic,
        duration_minutes: section.duration_minutes,
        expected_question_count: section.expected_question_count,
        generated_question_count: section.generated_question_count,
        questions: section.questions.map(toReviewQuestion),
      }));

      setFullReviewSections(sections);
      setTopicReviewQuestions([]);
      setAiDuration(response.total_duration_minutes);

      if (!aiTitle.trim()) {
        setAiTitle("NIMCET Full Length AI Test");
      }

      setSuccess(
        `Generated ${response.total_questions} AI question(s) across ${sections.length} section(s). Review and approve before creating the test.`,
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unable to generate full length AI test.";
      setError(message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAiCreateSuccess = (createdTest: AiCreatedTestResponse) => {
    setSuccess(
      `AI test created successfully with ${createdTest.total_questions} approved question(s) across ${createdTest.sections.length} section(s).`,
    );
    clearAiDrafts();
    setAiFlowMode(null);
    setAiTitle("");
    setAiTopic("");
  };

  const onCreateTopicAiTest = async () => {
    setError(null);
    setSuccess(null);
    setIsCreatingAiTest(true);

    try {
      const approvedQuestions = topicReviewQuestions
        .filter((question) => question.approved)
        .map(toAiPayloadQuestion);

      if (!approvedQuestions.length) {
        throw new Error("Approve at least one generated question before creating the test.");
      }

      const payload = {
        title: aiTitle.trim() || `${aiSubject}${aiTopic ? ` - ${aiTopic}` : ""} AI Test`,
        test_type: "topic_wise" as const,
        duration_minutes: clampPositiveInteger(aiDuration, 1, 500),
        sections: [
          {
            section_name: aiTopic.trim() ? `${aiSubject} - ${aiTopic.trim()}` : `${aiSubject} AI Section`,
            duration_minutes: clampPositiveInteger(aiDuration, 1, 500),
            questions: approvedQuestions,
          },
        ],
      };

      const createdTest = await createAiGeneratedTest(payload);
      handleAiCreateSuccess(createdTest);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to create topic wise AI test.";
      setError(message);
    } finally {
      setIsCreatingAiTest(false);
    }
  };

  const onCreateFullAiTest = async () => {
    setError(null);
    setSuccess(null);
    setIsCreatingAiTest(true);

    try {
      const approvedSections = fullReviewSections
        .map((section) => ({
          section_name: section.section_name,
          duration_minutes: section.duration_minutes,
          questions: section.questions.filter((question) => question.approved).map(toAiPayloadQuestion),
        }))
        .filter((section) => section.questions.length > 0);

      if (!approvedSections.length) {
        throw new Error("Approve at least one generated question before creating the test.");
      }

      const totalDuration = approvedSections.reduce(
        (sum, section) => sum + clampPositiveInteger(section.duration_minutes, 0),
        0,
      );

      const payload = {
        title: aiTitle.trim() || "NIMCET Full Length AI Test",
        test_type: "full_length" as const,
        duration_minutes: clampPositiveInteger(totalDuration || aiDuration, 1, 500),
        sections: approvedSections,
      };

      const createdTest = await createAiGeneratedTest(payload);
      handleAiCreateSuccess(createdTest);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to create full length AI test.";
      setError(message);
    } finally {
      setIsCreatingAiTest(false);
    }
  };

  const renderReviewQuestionCard = (
    question: ReviewQuestion,
    handlers: {
      onToggleEdit: (draftId: string) => void;
      onDelete: (draftId: string) => void;
      onToggleApprove: (draftId: string) => void;
      onFieldChange: (
        draftId: string,
        field: keyof AiGeneratedQuestion,
        value: string | number | boolean,
      ) => void;
    },
    sectionName?: string,
  ) => {
    const baseCardClasses =
      "rounded-xl border p-4 text-sm transition border-white/15 bg-white/5 text-slate-100 hover:bg-white/10";

    const approvedBadgeClasses = question.approved
      ? "rounded-full border border-emerald-300/45 bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-100"
      : "rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-slate-200";

    return (
      <article key={question.draft_id} className={baseCardClasses}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-100">
            {question.subject} · {question.topic} · {question.difficulty}
            {sectionName ? ` · ${sectionName}` : ""}
          </p>
          <span className={approvedBadgeClasses}>{question.approved ? "Approved" : "Not Approved"}</span>
        </div>

        {question.is_editing ? (
          <div className="mt-3 space-y-3">
            <textarea
              className="min-h-24 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100"
              value={question.question_text}
              onChange={(event) => handlers.onFieldChange(question.draft_id, "question_text", event.target.value)}
            />
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                value={question.option_a}
                onChange={(event) => handlers.onFieldChange(question.draft_id, "option_a", event.target.value)}
                placeholder="Option A"
              />
              <input
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                value={question.option_b}
                onChange={(event) => handlers.onFieldChange(question.draft_id, "option_b", event.target.value)}
                placeholder="Option B"
              />
              <input
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                value={question.option_c}
                onChange={(event) => handlers.onFieldChange(question.draft_id, "option_c", event.target.value)}
                placeholder="Option C"
              />
              <input
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                value={question.option_d}
                onChange={(event) => handlers.onFieldChange(question.draft_id, "option_d", event.target.value)}
                placeholder="Option D"
              />
              <select
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                value={question.correct_option}
                onChange={(event) =>
                  handlers.onFieldChange(
                    question.draft_id,
                    "correct_option",
                    event.target.value as AiGeneratedQuestion["correct_option"],
                  )
                }
              >
                <option value="A">Correct Option A</option>
                <option value="B">Correct Option B</option>
                <option value="C">Correct Option C</option>
                <option value="D">Correct Option D</option>
              </select>
              <input
                type="number"
                min={0}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                value={question.negative_marks}
                onChange={(event) =>
                  handlers.onFieldChange(
                    question.draft_id,
                    "negative_marks",
                    clampPositiveInteger(Number(event.target.value), 0),
                  )
                }
                placeholder="Negative Marks"
              />
              <input
                type="number"
                min={1}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                value={question.marks}
                onChange={(event) =>
                  handlers.onFieldChange(question.draft_id, "marks", clampPositiveInteger(Number(event.target.value)))
                }
                placeholder="Marks"
              />
              <select
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                value={question.difficulty}
                onChange={(event) =>
                  handlers.onFieldChange(question.draft_id, "difficulty", event.target.value as DifficultyLevel)
                }
              >
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-base text-white">{question.question_text}</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-200">
              <li>A. {question.option_a}</li>
              <li>B. {question.option_b}</li>
              <li>C. {question.option_c}</li>
              <li>D. {question.option_d}</li>
            </ul>
            <p className="mt-3 text-xs text-cyan-100">
              Correct Answer: {question.correct_option}. {getCorrectAnswerText(question)}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Marks: {question.marks} · Negative: {question.negative_marks}
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlers.onToggleEdit(question.draft_id)}
            className="rounded-lg border border-white/25 bg-white/5 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/10"
          >
            {question.is_editing ? "Save Edit" : "Edit"}
          </button>
          <button
            type="button"
            onClick={() => handlers.onDelete(question.draft_id)}
            className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs text-white hover:bg-rose-400"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => handlers.onToggleApprove(question.draft_id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${
              question.approved ? "bg-emerald-500 hover:bg-emerald-400" : "bg-indigo-500 hover:bg-indigo-400"
            }`}
          >
            {question.approved ? "Approved" : "Approve"}
          </button>
        </div>
      </article>
    );
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
        <section className="space-y-5">
          <section className="glass-card rounded-2xl p-6">
            <h3 className="font-display text-xl text-white">AI Test Generation</h3>
            <p className="mt-2 text-sm text-slate-300">
              Generate topic wise and full length tests from the global AI knowledge base, then review and approve questions.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={openTopicAiForm}
                className="hover-lift rounded-xl border border-cyan-300/35 bg-linear-to-r from-indigo-500/85 to-cyan-500/85 px-4 py-2.5 text-sm font-semibold text-white transition"
              >
                Generate Topic Wise AI Test
              </button>
              <button
                type="button"
                onClick={() => void onGenerateFullLengthAiTest()}
                disabled={isGeneratingAi}
                className="hover-lift rounded-xl border border-indigo-300/35 bg-linear-to-r from-fuchsia-500/80 to-indigo-500/85 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-70"
              >
                {isGeneratingAi && aiFlowMode === "full"
                  ? "Generating Full Length Test..."
                  : "Generate Full Length AI Test"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <input
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                placeholder="AI Test Title"
                value={aiTitle}
                onChange={(event) => setAiTitle(event.target.value)}
              />
              <select
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                value={aiDifficulty}
                onChange={(event) => setAiDifficulty(event.target.value as DifficultyLevel)}
              >
                <option value="easy">Difficulty: easy</option>
                <option value="medium">Difficulty: medium</option>
                <option value="hard">Difficulty: hard</option>
              </select>
              <input
                type="number"
                min={1}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                placeholder="Marks Per Question"
                value={aiMarksPerQuestion}
                onChange={(event) => setAiMarksPerQuestion(clampPositiveInteger(Number(event.target.value), 1, 20))}
              />
              <input
                type="number"
                min={0}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                placeholder="Negative Marking"
                value={aiNegativeMarking}
                onChange={(event) => setAiNegativeMarking(clampPositiveInteger(Number(event.target.value), 0, 20))}
              />
            </div>
          </section>

          {aiFlowMode === "topic" ? (
            <form onSubmit={onGenerateTopicAiQuestions} className="glass-card rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-display text-lg text-white">Topic Wise AI Test Configuration</h4>
                <p className="text-xs text-slate-300">Configure and generate question drafts</p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <select
                  className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                  value={aiSubject}
                  onChange={(event) => setAiSubject(event.target.value)}
                  required
                >
                  {SUBJECT_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                  placeholder="Topic"
                  value={aiTopic}
                  onChange={(event) => setAiTopic(event.target.value)}
                  required
                />
                <input
                  type="number"
                  min={1}
                  max={70}
                  className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                  placeholder="Number of Questions"
                  value={aiQuestionCount}
                  onChange={(event) => setAiQuestionCount(clampPositiveInteger(Number(event.target.value), 1, 70))}
                  required
                />
                <input
                  type="number"
                  min={1}
                  className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                  placeholder="Marks Per Question"
                  value={aiMarksPerQuestion}
                  onChange={(event) => setAiMarksPerQuestion(clampPositiveInteger(Number(event.target.value), 1, 20))}
                  required
                />
                <input
                  type="number"
                  min={0}
                  className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                  placeholder="Negative Marking"
                  value={aiNegativeMarking}
                  onChange={(event) => setAiNegativeMarking(clampPositiveInteger(Number(event.target.value), 0, 20))}
                  required
                />
                <select
                  className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                  value={aiDifficulty}
                  onChange={(event) => setAiDifficulty(event.target.value as DifficultyLevel)}
                >
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="hard">hard</option>
                </select>
                <input
                  type="number"
                  min={1}
                  className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
                  placeholder="Test Duration (minutes)"
                  value={aiDuration}
                  onChange={(event) => setAiDuration(clampPositiveInteger(Number(event.target.value), 1, 500))}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isGeneratingAi}
                className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-70"
              >
                {isGeneratingAi ? "Generating AI Questions..." : "Generate AI Questions"}
              </button>
            </form>
          ) : null}

          {aiFlowMode === "topic" && topicReviewQuestions.length ? (
            <section className="glass-card rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-display text-xl text-white">Topic Wise Question Review Panel</h4>
                <p className="text-sm text-slate-300">
                  Approved: {topicApprovedCount}/{topicReviewQuestions.length}
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {topicReviewQuestions.map((question) =>
                  renderReviewQuestionCard(question, {
                    onToggleEdit: (draftId) =>
                      updateTopicQuestion(draftId, (currentQuestion) => ({
                        ...currentQuestion,
                        is_editing: !currentQuestion.is_editing,
                      })),
                    onDelete: (draftId) =>
                      setTopicReviewQuestions((current) =>
                        current.filter((currentQuestion) => currentQuestion.draft_id !== draftId),
                      ),
                    onToggleApprove: (draftId) =>
                      updateTopicQuestion(draftId, (currentQuestion) => ({
                        ...currentQuestion,
                        approved: !currentQuestion.approved,
                      })),
                    onFieldChange: updateTopicQuestionField,
                  }),
                )}
              </div>

              <button
                type="button"
                disabled={isCreatingAiTest}
                onClick={() => void onCreateTopicAiTest()}
                className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-70"
              >
                {isCreatingAiTest ? "Creating Test..." : "Create Test From Approved Questions"}
              </button>
            </section>
          ) : null}

          {aiFlowMode === "full" ? (
            <section className="space-y-4">
              <section className="glass-card rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-display text-xl text-white">Full Length AI Test Review Panel</h4>
                  <p className="text-sm text-slate-300">
                    Approved: {fullApprovedCount}/{fullGeneratedCount} · Duration: {aiDuration} mins
                  </p>
                </div>
                {!fullReviewSections.length && !isGeneratingAi ? (
                  <p className="mt-3 text-sm text-slate-300">
                    Click Generate Full Length AI Test to fetch section wise questions.
                  </p>
                ) : null}
              </section>

              {fullReviewSections.map((section) => (
                <section key={section.section_name} className="glass-card rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h5 className="font-display text-lg text-white">{section.section_name}</h5>
                    <p className="text-xs text-slate-300">
                      {section.generated_question_count ?? section.questions.length}
                      {section.expected_question_count ? ` / ${section.expected_question_count}` : ""} questions ·
                      {" "}Duration {section.duration_minutes} mins
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {section.questions.map((question) =>
                      renderReviewQuestionCard(
                        question,
                        {
                          onToggleEdit: (draftId) =>
                            updateFullQuestion(section.section_name, draftId, (currentQuestion) => ({
                              ...currentQuestion,
                              is_editing: !currentQuestion.is_editing,
                            })),
                          onDelete: (draftId) =>
                            setFullReviewSections((current) =>
                              current.map((currentSection) => {
                                if (currentSection.section_name !== section.section_name) {
                                  return currentSection;
                                }

                                return {
                                  ...currentSection,
                                  questions: currentSection.questions.filter(
                                    (currentQuestion) => currentQuestion.draft_id !== draftId,
                                  ),
                                };
                              }),
                            ),
                          onToggleApprove: (draftId) =>
                            updateFullQuestion(section.section_name, draftId, (currentQuestion) => ({
                              ...currentQuestion,
                              approved: !currentQuestion.approved,
                            })),
                          onFieldChange: (draftId, field, value) =>
                            updateFullQuestionField(section.section_name, draftId, field, value),
                        },
                        section.section_name,
                      ),
                    )}
                  </div>
                </section>
              ))}

              {fullReviewSections.length ? (
                <button
                  type="button"
                  disabled={isCreatingAiTest}
                  onClick={() => void onCreateFullAiTest()}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-70"
                >
                  {isCreatingAiTest ? "Creating Full Length Test..." : "Create Full Length Test From Approved Questions"}
                </button>
              ) : null}
            </section>
          ) : null}
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
