const prisma = require("../../../db")

const ALLOWED_OPTIONS = ["A", "B", "C", "D"]

const createServiceError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const resolveStudentContext = async (user) => {
  const student = await prisma.student.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      coachingId: true,
      status: true,
    },
  })

  if (!student) {
    throw createServiceError("student profile not found", 403)
  }

  if (student.status !== "approved") {
    throw createServiceError("student account is not approved", 403)
  }

  return student
}

const getTestWithExamRelations = async (testId) => {
  return prisma.test.findUnique({
    where: {
      id: testId,
    },
    select: {
      id: true,
      coachingId: true,
      testSeriesId: true,
      title: true,
      type: true,
      totalQuestions: true,
      totalMarks: true,
      durationMinutes: true,
      scheduledStart: true,
      scheduledEnd: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      testSections: {
        orderBy: {
          orderIndex: "asc",
        },
        select: {
          id: true,
          sectionName: true,
          questionCount: true,
          durationMinutes: true,
          orderIndex: true,
        },
      },
      testQuestions: {
        orderBy: {
          orderIndex: "asc",
        },
        select: {
          questionId: true,
          sectionId: true,
          orderIndex: true,
          question: {
            select: {
              id: true,
              subject: true,
              topic: true,
              questionText: true,
              questionImageUrl: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
              marks: true,
              negativeMarks: true,
              correctOption: true,
            },
          },
        },
      },
    },
  })
}

const assertTestWindowOpen = (test) => {
  const now = new Date()

  if (!test.isActive) {
    throw createServiceError("test is not active", 400)
  }

  if (test.scheduledStart && now < test.scheduledStart) {
    throw createServiceError("test is not scheduled to start yet", 400)
  }

  if (test.scheduledEnd && now > test.scheduledEnd) {
    throw createServiceError("test has expired", 400)
  }
}

const assertStudentCanAccessTest = async (student, test) => {
  if (test.coachingId === student.coachingId) {
    return
  }

  if (!test.testSeriesId) {
    throw createServiceError("forbidden", 403)
  }

  const purchase = await prisma.purchase.findFirst({
    where: {
      studentId: student.id,
      testSeriesId: test.testSeriesId,
      paymentStatus: "success",
    },
    select: {
      id: true,
    },
  })

  if (!purchase) {
    throw createServiceError("you are not allowed to attempt this test", 403)
  }
}

const mapExamData = (test) => {
  const sections = test.testSections.map((section) => ({
    id: section.id,
    section_name: section.sectionName,
    question_count: section.questionCount,
    duration_minutes: section.durationMinutes,
    order_index: section.orderIndex,
  }))

  const questions = test.testQuestions.map((item, index) => ({
    id: item.question.id,
    section_id: item.sectionId,
    order_index: item.orderIndex,
    question_number: index + 1,
    subject: item.question.subject,
    topic: item.question.topic,
    question_text: item.question.questionText,
    question_image_url: item.question.questionImageUrl,
    options: {
      A: item.question.optionA,
      B: item.question.optionB,
      C: item.question.optionC,
      D: item.question.optionD,
    },
    marks: item.question.marks,
    negative_marks: item.question.negativeMarks,
  }))

  return {
    test: {
      id: test.id,
      title: test.title,
      type: test.type,
      total_questions: test.totalQuestions,
      total_marks: test.totalMarks,
      duration_minutes: test.durationMinutes,
      scheduled_start: test.scheduledStart,
      scheduled_end: test.scheduledEnd,
      is_active: test.isActive,
      created_at: test.createdAt,
      updated_at: test.updatedAt,
    },
    sections,
    questions,
    duration_minutes: test.durationMinutes,
  }
}

const mapAttemptAnswers = (studentAnswers) => {
  return studentAnswers.map((answer) => ({
    question_id: answer.questionId,
    selected_option: answer.selectedOption,
    is_marked_review: answer.isMarkedReview,
    time_spent_seconds: answer.timeSpentSeconds,
    saved_at: answer.savedAt,
  }))
}

const recalculateRanksForTest = async (tx, testId) => {
  const orderedResults = await tx.result.findMany({
    where: {
      testId,
    },
    orderBy: [
      {
        totalScore: "desc",
      },
      {
        accuracyPercentage: "desc",
      },
      {
        generatedAt: "asc",
      },
    ],
    select: {
      id: true,
      totalScore: true,
      accuracyPercentage: true,
    },
  })

  let currentRank = 0
  let previousScore = null
  let previousAccuracy = null

  const updates = orderedResults.map((item, index) => {
    const score = Number(item.totalScore)
    const accuracy = Number(item.accuracyPercentage)

    if (score !== previousScore || accuracy !== previousAccuracy) {
      currentRank = index + 1
      previousScore = score
      previousAccuracy = accuracy
    }

    return {
      id: item.id,
      rank: currentRank,
    }
  })

  await Promise.all(
    updates.map((item) =>
      tx.result.update({
        where: {
          id: item.id,
        },
        data: {
          rank: item.rank,
        },
      }),
    ),
  )

  return new Map(updates.map((item) => [item.id, item.rank]))
}

const getExamData = async (testId, user) => {
  if (!testId) {
    throw createServiceError("testId is required", 400)
  }

  const student = await resolveStudentContext(user)
  const test = await getTestWithExamRelations(testId)

  if (!test) {
    throw createServiceError("invalid test id", 404)
  }

  await assertStudentCanAccessTest(student, test)
  assertTestWindowOpen(test)

  const activeAttempt = await prisma.examAttempt.findFirst({
    where: {
      studentId: student.id,
      testId,
      isSubmitted: false,
    },
    orderBy: {
      startedAt: "desc",
    },
    select: {
      id: true,
      startedAt: true,
      submittedAt: true,
      isSubmitted: true,
      studentAnswers: {
        select: {
          questionId: true,
          selectedOption: true,
          isMarkedReview: true,
          timeSpentSeconds: true,
          savedAt: true,
        },
      },
    },
  })

  return {
    ...mapExamData(test),
    attempt: activeAttempt
      ? {
          id: activeAttempt.id,
          started_at: activeAttempt.startedAt,
          submitted_at: activeAttempt.submittedAt,
          is_submitted: activeAttempt.isSubmitted,
          answers: mapAttemptAnswers(activeAttempt.studentAnswers),
        }
      : null,
  }
}

const startAttempt = async (payload, user) => {
  const testId = payload.testId || payload.test_id

  if (!testId) {
    throw createServiceError("testId is required", 400)
  }

  const student = await resolveStudentContext(user)
  const test = await getTestWithExamRelations(testId)

  if (!test) {
    throw createServiceError("invalid test id", 404)
  }

  await assertStudentCanAccessTest(student, test)
  assertTestWindowOpen(test)

  const submittedAttempt = await prisma.examAttempt.findFirst({
    where: {
      studentId: student.id,
      testId,
      isSubmitted: true,
    },
    orderBy: {
      submittedAt: "desc",
    },
    select: {
      id: true,
    },
  })

  if (submittedAttempt) {
    throw createServiceError("test already submitted", 400)
  }

  let activeAttempt = await prisma.examAttempt.findFirst({
    where: {
      studentId: student.id,
      testId,
      isSubmitted: false,
    },
    orderBy: {
      startedAt: "desc",
    },
    select: {
      id: true,
      startedAt: true,
      submittedAt: true,
      isSubmitted: true,
      studentAnswers: {
        select: {
          questionId: true,
          selectedOption: true,
          isMarkedReview: true,
          timeSpentSeconds: true,
          savedAt: true,
        },
      },
    },
  })

  if (!activeAttempt) {
    const createdAttempt = await prisma.examAttempt.create({
      data: {
        studentId: student.id,
        testId,
        isSubmitted: false,
        startedAt: new Date(),
      },
      select: {
        id: true,
      },
    })

    activeAttempt = {
      id: createdAttempt.id,
      startedAt: new Date(),
      submittedAt: null,
      isSubmitted: false,
      studentAnswers: [],
    }
  }

  return {
    attempt_id: activeAttempt.id,
    started_at: activeAttempt.startedAt,
    ...mapExamData(test),
    answers: mapAttemptAnswers(activeAttempt.studentAnswers),
  }
}

const saveAnswer = async (payload, user) => {
  const attemptId = payload.attemptId || payload.attempt_id
  const questionId = payload.questionId || payload.question_id
  const selectedOption = payload.selectedOption ?? payload.selected_option ?? null
  const isMarkedReview = Boolean(payload.isMarkedReview ?? payload.is_marked_review)
  const timeSpentSecondsRaw = payload.timeSpentSeconds ?? payload.time_spent_seconds

  if (!attemptId || !questionId) {
    throw createServiceError("attemptId and questionId are required", 400)
  }

  if (selectedOption !== null && !ALLOWED_OPTIONS.includes(String(selectedOption))) {
    throw createServiceError("selectedOption must be one of A, B, C or D", 400)
  }

  const timeSpentSeconds =
    timeSpentSecondsRaw === undefined || timeSpentSecondsRaw === null
      ? 0
      : Number(timeSpentSecondsRaw)

  if (!Number.isFinite(timeSpentSeconds) || timeSpentSeconds < 0) {
    throw createServiceError("time_spent_seconds must be a non-negative number", 400)
  }

  const student = await resolveStudentContext(user)

  const attempt = await prisma.examAttempt.findUnique({
    where: {
      id: attemptId,
    },
    select: {
      id: true,
      studentId: true,
      testId: true,
      isSubmitted: true,
    },
  })

  if (!attempt) {
    throw createServiceError("invalid attempt", 404)
  }

  if (attempt.studentId !== student.id) {
    throw createServiceError("forbidden", 403)
  }

  if (attempt.isSubmitted) {
    throw createServiceError("exam already submitted", 400)
  }

  const testQuestion = await prisma.testQuestion.findFirst({
    where: {
      testId: attempt.testId,
      questionId,
    },
    select: {
      id: true,
    },
  })

  if (!testQuestion) {
    throw createServiceError("question does not belong to this test", 400)
  }

  const savedAnswer = await prisma.studentAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId,
      },
    },
    update: {
      selectedOption: selectedOption ? String(selectedOption) : null,
      isMarkedReview,
      timeSpentSeconds: Math.round(timeSpentSeconds),
      savedAt: new Date(),
    },
    create: {
      attemptId,
      questionId,
      selectedOption: selectedOption ? String(selectedOption) : null,
      isMarkedReview,
      timeSpentSeconds: Math.round(timeSpentSeconds),
      savedAt: new Date(),
    },
    select: {
      id: true,
      attemptId: true,
      questionId: true,
      selectedOption: true,
      isMarkedReview: true,
      timeSpentSeconds: true,
      savedAt: true,
    },
  })

  return {
    id: savedAnswer.id,
    attempt_id: savedAnswer.attemptId,
    question_id: savedAnswer.questionId,
    selected_option: savedAnswer.selectedOption,
    is_marked_review: savedAnswer.isMarkedReview,
    time_spent_seconds: savedAnswer.timeSpentSeconds,
    saved_at: savedAnswer.savedAt,
  }
}

const submitAttempt = async (payload, user) => {
  const attemptId = payload.attemptId || payload.attempt_id

  if (!attemptId) {
    throw createServiceError("attemptId is required", 400)
  }

  const student = await resolveStudentContext(user)

  const attempt = await prisma.examAttempt.findUnique({
    where: {
      id: attemptId,
    },
    select: {
      id: true,
      studentId: true,
      testId: true,
      isSubmitted: true,
      test: {
        select: {
          totalQuestions: true,
          testQuestions: {
            orderBy: {
              orderIndex: "asc",
            },
            select: {
              questionId: true,
              question: {
                select: {
                  correctOption: true,
                  marks: true,
                  negativeMarks: true,
                },
              },
            },
          },
        },
      },
      studentAnswers: {
        select: {
          questionId: true,
          selectedOption: true,
          isMarkedReview: true,
        },
      },
      result: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!attempt) {
    throw createServiceError("invalid attempt", 404)
  }

  if (attempt.studentId !== student.id) {
    throw createServiceError("forbidden", 403)
  }

  if (attempt.isSubmitted) {
    throw createServiceError("exam already submitted", 400)
  }

  const answerByQuestionId = new Map(
    attempt.studentAnswers.map((answer) => [answer.questionId, answer]),
  )

  let correctCount = 0
  let wrongCount = 0
  let attemptedCount = 0
  let score = 0

  attempt.test.testQuestions.forEach((item) => {
    const answer = answerByQuestionId.get(item.questionId)

    if (!answer || !answer.selectedOption) {
      return
    }

    attemptedCount += 1

    if (answer.selectedOption === item.question.correctOption) {
      correctCount += 1
      score += Number(item.question.marks)
    } else {
      wrongCount += 1
      score -= Number(item.question.negativeMarks || 0)
    }
  })

  const totalQuestions = attempt.test.totalQuestions
  const unattemptedCount = Math.max(totalQuestions - attemptedCount, 0)
  const accuracyPercentage = attemptedCount
    ? Number(((correctCount / attemptedCount) * 100).toFixed(2))
    : 0

  const submittedAt = new Date()

  const result = await prisma.$transaction(async (tx) => {
    await tx.examAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        isSubmitted: true,
        submittedAt,
        score,
      },
    })

    const upsertedResult = await tx.result.upsert({
      where: {
        attemptId: attempt.id,
      },
      update: {
        studentId: student.id,
        testId: attempt.testId,
        totalScore: score,
        correctCount,
        wrongCount,
        unattemptedCount,
        accuracyPercentage,
        generatedAt: submittedAt,
      },
      create: {
        attemptId: attempt.id,
        studentId: student.id,
        testId: attempt.testId,
        totalScore: score,
        correctCount,
        wrongCount,
        unattemptedCount,
        accuracyPercentage,
        generatedAt: submittedAt,
      },
      select: {
        id: true,
        totalScore: true,
        correctCount: true,
        wrongCount: true,
        unattemptedCount: true,
        accuracyPercentage: true,
      },
    })

    const rankMap = await recalculateRanksForTest(tx, attempt.testId)

    return {
      ...upsertedResult,
      rank: rankMap.get(upsertedResult.id) || null,
    }
  })

  return {
    attempt_id: attempt.id,
    result_id: result.id,
    total_questions: totalQuestions,
    attempted_questions: attemptedCount,
    correct_answers: result.correctCount,
    wrong_answers: result.wrongCount,
    unattempted_questions: result.unattemptedCount,
    total_score: Number(result.totalScore),
    accuracy_percentage: Number(result.accuracyPercentage),
    rank: result.rank,
  }
}

const getResultByAttempt = async (attemptId, user) => {
  if (!attemptId) {
    throw createServiceError("attemptId is required", 400)
  }

  const student = await resolveStudentContext(user)

  const result = await prisma.result.findFirst({
    where: {
      attemptId,
      studentId: student.id,
    },
    select: {
      id: true,
      attemptId: true,
      testId: true,
      totalScore: true,
      correctCount: true,
      wrongCount: true,
      unattemptedCount: true,
      accuracyPercentage: true,
      rank: true,
      generatedAt: true,
      test: {
        select: {
          title: true,
        },
      },
    },
  })

  if (!result) {
    throw createServiceError("result not found for this attempt", 404)
  }

  return {
    id: result.id,
    attempt_id: result.attemptId,
    test_id: result.testId,
    test_name: result.test.title,
    total_score: Number(result.totalScore),
    correct_answers: result.correctCount,
    wrong_answers: result.wrongCount,
    unattempted_questions: result.unattemptedCount,
    accuracy_percentage: Number(result.accuracyPercentage),
    rank: result.rank,
    generated_at: result.generatedAt,
  }
}

module.exports = {
  startAttempt,
  getExamData,
  saveAnswer,
  submitAttempt,
  getResultByAttempt,
}
