"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  getExamData,
  saveExamAnswer,
  startExamAttempt,
  submitExamAttempt,
  type ExamDataResponse,
  type ExamQuestion,
  type OptionChoice,
} from "@/lib/api";
import { ExamHeader } from "@/components/exam/ExamHeader";
import { InstructionScreen } from "@/components/exam/InstructionScreen";
import { QuestionPanel } from "@/components/exam/QuestionPanel";
import { QuestionPalette } from "@/components/exam/QuestionPalette";
import { ExamFooter } from "@/components/exam/ExamFooter";
import { SubmitModal } from "@/components/exam/SubmitModal";
import { WarningModal } from "@/components/exam/WarningModal";

type StudentExamPageProps = {
  params: {
    testId: string;
  };
};

type ExamPhase = "loading" | "instruction" | "exam" | "submitted" | "error";

type AnswerState = {
  selectedOption: OptionChoice | null;
  isMarkedReview: boolean;
  timeSpentSeconds: number;
};

const createErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while loading the exam.";
};

const toAnswerMap = (answers: Array<{
  question_id: string;
  selected_option: OptionChoice | null;
  is_marked_review: boolean;
  time_spent_seconds: number;
}>) => {
  return answers.reduce<Record<string, AnswerState>>((acc, answer) => {
    acc[answer.question_id] = {
      selectedOption: answer.selected_option,
      isMarkedReview: answer.is_marked_review,
      timeSpentSeconds: answer.time_spent_seconds,
    };
    return acc;
  }, {});
};

const getQuestionStatus = (
  questionId: string,
  visited: Record<string, boolean>,
  answers: Record<string, AnswerState>,
) => {
  if (!visited[questionId]) {
    return "not_visited" as const;
  }

  if (answers[questionId]?.isMarkedReview) {
    return "marked_review" as const;
  }

  if (answers[questionId]?.selectedOption) {
    return "answered" as const;
  }

  return "visited_unanswered" as const;
};

const getSecondsRemaining = (durationMinutes: number, startedAt: string) => {
  const started = new Date(startedAt).getTime();

  if (Number.isNaN(started)) {
    return durationMinutes * 60;
  }

  const elapsedSeconds = Math.floor((Date.now() - started) / 1000);
  return Math.max(0, durationMinutes * 60 - elapsedSeconds);
};

export default function StudentExamPage({ params }: StudentExamPageProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<ExamPhase>("loading");
  const [examData, setExamData] = useState<ExamDataResponse | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [warning, setWarning] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "Warning",
    message: "",
  });
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  const autoSubmitRef = useRef(false);
  const tabSwitchRef = useRef(0);

  const questions = useMemo(() => examData?.questions ?? [], [examData]);
  const currentQuestion: ExamQuestion | null = questions[currentQuestionIndex] || null;
  const hasExistingAttempt = Boolean(examData?.attempt?.id);

  const questionStatuses = useMemo(() => {
    return questions.map((question) => getQuestionStatus(question.id, visitedQuestions, answers));
  }, [answers, questions, visitedQuestions]);

  const summary = useMemo(() => {
    const total = questions.length;
    const answered = questions.filter((question) => Boolean(answers[question.id]?.selectedOption)).length;
    const markedReview = questions.filter((question) => Boolean(answers[question.id]?.isMarkedReview)).length;
    const notAnswered = total - answered;

    return {
      total,
      answered,
      notAnswered,
      markedReview,
    };
  }, [answers, questions]);

  const enterFullscreen = useCallback(async () => {
    if (typeof document === "undefined") {
      return;
    }

    if (document.fullscreenElement) {
      return;
    }

    const root = document.documentElement;

    if (root.requestFullscreen) {
      try {
        await root.requestFullscreen();
      } catch {
        setWarning({
          open: true,
          title: "Fullscreen Required",
          message: "Please allow fullscreen mode for a secure exam experience.",
        });
      }
    }
  }, []);

  const hydrateExamState = useCallback(
    (payload: {
      attemptId: string | null;
      durationMinutes: number;
      startedAt: string | null;
      answersPayload: Array<{
        question_id: string;
        selected_option: OptionChoice | null;
        is_marked_review: boolean;
        time_spent_seconds: number;
      }>;
    }) => {
      const mappedAnswers = toAnswerMap(payload.answersPayload);
      setAnswers(mappedAnswers);
      setAttemptId(payload.attemptId);

      const initialVisited: Record<string, boolean> = {};
      questions.forEach((question, index) => {
        if (mappedAnswers[question.id] || index === 0) {
          initialVisited[question.id] = true;
        }
      });

      setVisitedQuestions(initialVisited);
      setCurrentQuestionIndex(0);

      if (payload.startedAt) {
        setSecondsLeft(getSecondsRemaining(payload.durationMinutes, payload.startedAt));
      } else {
        setSecondsLeft(payload.durationMinutes * 60);
      }
    },
    [questions],
  );

  const submitNow = useCallback(
    async (reason: "manual" | "timer" | "security") => {
      if (!attemptId || autoSubmitRef.current) {
        return;
      }

      autoSubmitRef.current = true;
      setIsSubmitting(true);

      try {
        const result = await submitExamAttempt({ attemptId });
        setPhase("submitted");

        if (reason !== "manual") {
          setWarning({
            open: true,
            title: "Exam Submitted",
            message:
              reason === "timer"
                ? "Time is over. Your exam has been submitted automatically."
                : "Your exam has been submitted due to repeated security violations.",
          });
        }

        router.replace(`/student/results/${result.result_id}`);
      } catch (error) {
        autoSubmitRef.current = false;
        setErrorMessage(createErrorMessage(error));
      } finally {
        setIsSubmitting(false);
        setIsSubmitModalOpen(false);
      }
    },
    [attemptId, router],
  );

  const persistAnswer = useCallback(
    async (
      questionId: string,
      payload: {
        selectedOption: OptionChoice | null;
        isMarkedReview: boolean;
      },
    ) => {
      if (!attemptId) {
        return;
      }

      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          selectedOption: payload.selectedOption,
          isMarkedReview: payload.isMarkedReview,
          timeSpentSeconds: prev[questionId]?.timeSpentSeconds || 0,
        },
      }));

      setIsSaving(true);

      try {
        await saveExamAnswer({
          attemptId,
          questionId,
          selectedOption: payload.selectedOption,
          isMarkedReview: payload.isMarkedReview,
        });
      } catch (error) {
        setErrorMessage(createErrorMessage(error));
      } finally {
        setIsSaving(false);
      }
    },
    [attemptId],
  );

  const jumpToQuestion = useCallback(
    (index: number) => {
      const question = questions[index];
      if (!question) {
        return;
      }

      setCurrentQuestionIndex(index);
      setVisitedQuestions((prev) => ({
        ...prev,
        [question.id]: true,
      }));
    },
    [questions],
  );

  useEffect(() => {
    let ignore = false;

    const loadExam = async () => {
      setPhase("loading");
      setErrorMessage(null);

      try {
        const data = await getExamData(params.testId);

        if (ignore) {
          return;
        }

        setExamData(data);
        setSecondsLeft(data.duration_minutes * 60);
        setPhase("instruction");
      } catch (error) {
        if (ignore) {
          return;
        }

        setPhase("error");
        setErrorMessage(createErrorMessage(error));
      }
    };

    void loadExam();

    return () => {
      ignore = true;
    };
  }, [params.testId]);

  useEffect(() => {
    if (phase !== "exam") {
      return;
    }

    if (secondsLeft <= 0) {
      void submitNow("timer");
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [phase, secondsLeft, submitNow]);

  useEffect(() => {
    if (phase !== "exam") {
      return;
    }

    const onVisibilityChange = () => {
      if (!document.hidden) {
        return;
      }

      const nextCount = tabSwitchRef.current + 1;
      tabSwitchRef.current = nextCount;
      setTabSwitchCount(nextCount);

      if (nextCount >= 3) {
        setWarning({
          open: true,
          title: "Security Limit Reached",
          message: "You switched tabs too many times. The exam will be submitted automatically.",
        });
        void submitNow("security");
        return;
      }

      setWarning({
        open: true,
        title: "Tab Switch Detected",
        message: `Tab switch count: ${nextCount}/3. Repeated switches will auto submit the exam.`,
      });
    };

    const blockEvent = (event: Event) => {
      event.preventDefault();
    };

    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        return;
      }

      setWarning({
        open: true,
        title: "Fullscreen Exit Detected",
        message: "Please stay in fullscreen mode during the exam.",
      });

      void enterFullscreen();
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "Exam is in progress.";
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("copy", blockEvent);
    document.addEventListener("paste", blockEvent);
    document.addEventListener("cut", blockEvent);
    document.addEventListener("contextmenu", blockEvent);
    document.addEventListener("selectstart", blockEvent);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("copy", blockEvent);
      document.removeEventListener("paste", blockEvent);
      document.removeEventListener("cut", blockEvent);
      document.removeEventListener("contextmenu", blockEvent);
      document.removeEventListener("selectstart", blockEvent);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [enterFullscreen, phase, submitNow]);

  const handleStartExam = async () => {
    setErrorMessage(null);
    setIsStarting(true);

    try {
      const payload = await startExamAttempt({ testId: params.testId });

      setExamData((prev) => {
        if (!prev) {
          return null;
        }

        return {
          test: payload.test,
          sections: payload.sections,
          questions: payload.questions,
          duration_minutes: payload.duration_minutes,
          attempt: {
            id: payload.attempt_id,
            started_at: payload.started_at,
            submitted_at: null,
            is_submitted: false,
            answers: payload.answers,
          },
        };
      });

      hydrateExamState({
        attemptId: payload.attempt_id,
        durationMinutes: payload.duration_minutes,
        startedAt: payload.started_at,
        answersPayload: payload.answers,
      });

      tabSwitchRef.current = 0;
      setTabSwitchCount(0);
      setPhase("exam");
      await enterFullscreen();
    } catch (error) {
      setErrorMessage(createErrorMessage(error));
      setPhase("error");
    } finally {
      setIsStarting(false);
    }
  };

  const handleSelectOption = async (option: OptionChoice) => {
    if (!currentQuestion) {
      return;
    }

    const current = answers[currentQuestion.id];
    const nextPayload = {
      selectedOption: option,
      isMarkedReview: current?.isMarkedReview || false,
    };

    setVisitedQuestions((prev) => ({
      ...prev,
      [currentQuestion.id]: true,
    }));

    await persistAnswer(currentQuestion.id, nextPayload);
  };

  const handleSaveAndNext = async () => {
    if (!currentQuestion) {
      return;
    }

    const existing = answers[currentQuestion.id] || {
      selectedOption: null,
      isMarkedReview: false,
    };

    await persistAnswer(currentQuestion.id, {
      selectedOption: existing.selectedOption,
      isMarkedReview: existing.isMarkedReview,
    });

    if (currentQuestionIndex < questions.length - 1) {
      jumpToQuestion(currentQuestionIndex + 1);
    }
  };

  const handleMarkForReview = async () => {
    if (!currentQuestion) {
      return;
    }

    const existing = answers[currentQuestion.id] || {
      selectedOption: null,
      isMarkedReview: false,
    };

    await persistAnswer(currentQuestion.id, {
      selectedOption: existing.selectedOption,
      isMarkedReview: true,
    });

    if (currentQuestionIndex < questions.length - 1) {
      jumpToQuestion(currentQuestionIndex + 1);
    }
  };

  const handleClearResponse = async () => {
    if (!currentQuestion) {
      return;
    }

    await persistAnswer(currentQuestion.id, {
      selectedOption: null,
      isMarkedReview: false,
    });
  };

  if (phase === "loading") {
    return (
      <section className="space-y-4 page-enter">
        <h1 className="font-display text-2xl text-white">Loading Exam...</h1>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section className="space-y-4 page-enter">
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/12 p-5 text-rose-100">
          <p className="font-medium">Unable to open exam</p>
          <p className="mt-1 text-sm">{errorMessage || "Please try again after some time."}</p>
        </div>
      </section>
    );
  }

  if (!examData) {
    return null;
  }

  if (phase === "instruction") {
    const firstQuestion = examData.questions[0];

    return (
      <InstructionScreen
        testName={examData.test.title}
        totalQuestions={examData.questions.length}
        durationMinutes={examData.duration_minutes}
        positiveMarks={firstQuestion?.marks || 0}
        negativeMarks={firstQuestion?.negative_marks || 0}
        loading={isStarting}
        onStart={handleStartExam}
        hasAttempt={hasExistingAttempt}
      />
    );
  }

  return (
    <section className="page-enter">
      <ExamHeader
        testName={examData.test.title}
        totalQuestions={questions.length}
        secondsLeft={secondsLeft}
        onSubmitClick={() => setIsSubmitModalOpen(true)}
        isSubmitting={isSubmitting}
      />

      <div className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_320px] md:px-6">
        <div>
          {errorMessage ? (
            <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-500/15 p-3 text-sm text-amber-100">
              {errorMessage}
            </div>
          ) : null}

          {currentQuestion ? (
            <QuestionPanel
              question={currentQuestion}
              selectedOption={answers[currentQuestion.id]?.selectedOption || null}
              onSelectOption={(option) => {
                void handleSelectOption(option);
              }}
            />
          ) : null}
        </div>

        <QuestionPalette
          currentIndex={currentQuestionIndex}
          statuses={questionStatuses}
          onJump={(index) => jumpToQuestion(index)}
        />
      </div>

      <div className="px-4 pb-2 text-xs text-slate-300 md:px-6">
        Auto save: {isSaving ? "Saving..." : "All changes saved"} · Tab switches: {tabSwitchCount}/3
      </div>

      <ExamFooter
        canGoPrevious={currentQuestionIndex > 0}
        canGoNext={currentQuestionIndex < questions.length - 1}
        onPrevious={() => jumpToQuestion(currentQuestionIndex - 1)}
        onSaveAndNext={() => {
          void handleSaveAndNext();
        }}
        onMarkForReview={() => {
          void handleMarkForReview();
        }}
        onClear={() => {
          void handleClearResponse();
        }}
        busy={isSubmitting}
      />

      <SubmitModal
        open={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={() => {
          void submitNow("manual");
        }}
        submitting={isSubmitting}
        summary={summary}
      />

      <WarningModal
        open={warning.open}
        title={warning.title}
        message={warning.message}
        onClose={() => setWarning((prev) => ({ ...prev, open: false }))}
      />
    </section>
  );
}