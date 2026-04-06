const prisma = require("../../db")
const { sendStudentApprovalEmail, sendStudentRejectionEmail } = require("./email.service")

const createServiceError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const ALLOWED_STUDENT_STATUSES = ["pending", "approved", "rejected"]

const toNumber = (value) => {
  if (value === null || value === undefined) {
    return 0
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const toPercent = (numerator, denominator) => {
  if (!denominator) {
    return 0
  }

  return Number(((numerator / denominator) * 100).toFixed(2))
}

const normalizeListQuery = (query = {}) => {
  const parsedPage = Number(query.page)
  const parsedLimit = Number(query.limit)
  const parsedTopN = Number(query.top_n || query.topN)

  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 10
  const topN = Number.isInteger(parsedTopN) && parsedTopN > 0 ? Math.min(parsedTopN, 100) : null

  return {
    page,
    limit,
    topN,
  }
}

const buildPaginationMeta = (totalItems, page, limit) => {
  const totalPages = totalItems ? Math.ceil(totalItems / limit) : 1

  return {
    page,
    limit,
    total_items: totalItems,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  }
}

const resolveCoachingIdForAdmin = async (coachingAdminUserId) => {
  const coachingInstitute = await prisma.coachingInstitute.findUnique({
    where: {
      userId: coachingAdminUserId,
    },
    select: {
      id: true,
      status: true,
    },
  })

  if (!coachingInstitute) {
    throw createServiceError("coaching profile not found", 403)
  }

  if (coachingInstitute.status !== "approved") {
    throw createServiceError("coaching account is not approved", 403)
  }

  return coachingInstitute.id
}

const getPendingStudents = async (coachingAdminUserId) => {
  const coachingId = await resolveCoachingIdForAdmin(coachingAdminUserId)

  return prisma.student.findMany({
    where: {
      coachingId,
      status: "pending",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      examPreparingFor: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  })
}

const getStudents = async (coachingAdminUserId, status = "pending") => {
  if (!ALLOWED_STUDENT_STATUSES.includes(status)) {
    throw createServiceError("status must be pending, approved or rejected", 400)
  }

  const coachingId = await resolveCoachingIdForAdmin(coachingAdminUserId)

  return prisma.student.findMany({
    where: {
      coachingId,
      status,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      examPreparingFor: true,
      status: true,
      createdAt: true,
      approvedAt: true,
      rejectionReason: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  })
}

const getStudentProfile = async (studentId, coachingAdminUserId) => {
  const coachingId = await resolveCoachingIdForAdmin(coachingAdminUserId)

  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
    },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      examPreparingFor: true,
      status: true,
      createdAt: true,
      approvedAt: true,
      rejectionReason: true,
      coachingId: true,
      user: {
        select: {
          email: true,
          createdAt: true,
        },
      },
    },
  })

  if (!student) {
    throw createServiceError("student not found", 404)
  }

  if (student.coachingId !== coachingId) {
    throw createServiceError("forbidden", 403)
  }

  const [attemptCount, resultCount, purchaseCount] = await Promise.all([
    prisma.examAttempt.count({
      where: {
        studentId: student.id,
      },
    }),
    prisma.result.count({
      where: {
        studentId: student.id,
      },
    }),
    prisma.purchase.count({
      where: {
        studentId: student.id,
      },
    }),
  ])

  return {
    id: student.id,
    name: student.name,
    email: student.user?.email || null,
    phone_number: student.phoneNumber,
    exam_preparing_for: student.examPreparingFor,
    status: student.status,
    created_at: student.createdAt,
    approved_at: student.approvedAt,
    rejection_reason: student.rejectionReason,
    stats: {
      attempts: attemptCount,
      results: resultCount,
      purchases: purchaseCount,
    },
  }
}

const getDashboardAnalytics = async (coachingAdminUserId) => {
  const coachingId = await resolveCoachingIdForAdmin(coachingAdminUserId)

  const tests = await prisma.test.findMany({
    where: {
      coachingId,
    },
    select: {
      id: true,
      title: true,
      testQuestions: {
        select: {
          sectionId: true,
          questionId: true,
        },
      },
      testSections: {
        select: {
          id: true,
          sectionName: true,
        },
      },
    },
  })

  const testIds = tests.map((test) => test.id)

  if (!testIds.length) {
    return {
      metrics: {
        total_students_attempted: 0,
        average_score: 0,
        highest_score: 0,
        lowest_score: 0,
        accuracy_percentage: 0,
      },
      score_distribution: [],
      section_performance: [],
      difficulty_analysis: [],
    }
  }

  const [distinctAttempts, results, studentAnswers] = await Promise.all([
    prisma.examAttempt.findMany({
      where: {
        testId: {
          in: testIds,
        },
      },
      distinct: ["studentId"],
      select: {
        studentId: true,
      },
    }),
    prisma.result.findMany({
      where: {
        testId: {
          in: testIds,
        },
      },
      select: {
        totalScore: true,
        accuracyPercentage: true,
      },
    }),
    prisma.studentAnswer.findMany({
      where: {
        examAttempt: {
          testId: {
            in: testIds,
          },
        },
      },
      select: {
        selectedOption: true,
        questionId: true,
        examAttempt: {
          select: {
            testId: true,
          },
        },
        question: {
          select: {
            correctOption: true,
            difficulty: true,
          },
        },
      },
    }),
  ])

  const scores = results.map((item) => toNumber(item.totalScore))
  const averageScore = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0
  const highestScore = scores.length ? Math.max(...scores) : 0
  const lowestScore = scores.length ? Math.min(...scores) : 0
  const averageAccuracy =
    results.length
      ? results.reduce((sum, item) => sum + toNumber(item.accuracyPercentage), 0) / results.length
      : 0

  const distributionBuckets = [
    { range: "0-20", min: 0, max: 20, count: 0 },
    { range: "21-40", min: 21, max: 40, count: 0 },
    { range: "41-60", min: 41, max: 60, count: 0 },
    { range: "61-80", min: 61, max: 80, count: 0 },
    { range: "81-100", min: 81, max: 100, count: 0 },
  ]

  scores.forEach((score) => {
    const bucket = distributionBuckets.find((item) => score >= item.min && score <= item.max)
    if (bucket) {
      bucket.count += 1
    }
  })

  const sectionByCompositeKey = new Map()
  tests.forEach((test) => {
    test.testSections.forEach((section) => {
      sectionByCompositeKey.set(`${test.id}:${section.id}`, section.sectionName)
    })
  })

  const mappingByCompositeKey = new Map()
  tests.forEach((test) => {
    test.testQuestions.forEach((mapping) => {
      mappingByCompositeKey.set(`${test.id}:${mapping.questionId}`, mapping.sectionId)
    })
  })

  const sectionStats = new Map()
  const difficultyStats = {
    easy: { attempted: 0, correct: 0 },
    medium: { attempted: 0, correct: 0 },
    hard: { attempted: 0, correct: 0 },
  }

  studentAnswers.forEach((answer) => {
    if (!answer.selectedOption) {
      return
    }

    const testId = answer.examAttempt.testId
    const sectionId = mappingByCompositeKey.get(`${testId}:${answer.questionId}`)
    if (sectionId) {
      const sectionName = sectionByCompositeKey.get(`${testId}:${sectionId}`) || "Unknown Section"
      const currentSection = sectionStats.get(sectionName) || { attempted: 0, correct: 0 }
      currentSection.attempted += 1
      if (answer.selectedOption === answer.question.correctOption) {
        currentSection.correct += 1
      }
      sectionStats.set(sectionName, currentSection)
    }

    const difficulty = answer.question.difficulty
    if (difficultyStats[difficulty]) {
      difficultyStats[difficulty].attempted += 1
      if (answer.selectedOption === answer.question.correctOption) {
        difficultyStats[difficulty].correct += 1
      }
    }
  })

  const sectionPerformance = Array.from(sectionStats.entries()).map(([sectionName, value]) => ({
    section_name: sectionName,
    attempted: value.attempted,
    accuracy_percentage: toPercent(value.correct, value.attempted),
  }))

  const difficultyAnalysis = Object.entries(difficultyStats).map(([difficulty, value]) => ({
    difficulty,
    attempted: value.attempted,
    correct: value.correct,
    accuracy_percentage: toPercent(value.correct, value.attempted),
  }))

  return {
    metrics: {
      total_students_attempted: distinctAttempts.length,
      average_score: Number(averageScore.toFixed(2)),
      highest_score: Number(highestScore.toFixed(2)),
      lowest_score: Number(lowestScore.toFixed(2)),
      accuracy_percentage: Number(averageAccuracy.toFixed(2)),
    },
    score_distribution: distributionBuckets.map((item) => ({
      range: item.range,
      count: item.count,
    })),
    section_performance: sectionPerformance,
    difficulty_analysis: difficultyAnalysis,
  }
}

const getTestAnalytics = async (testId, coachingAdminUserId, query = {}) => {
  if (!testId) {
    throw createServiceError("testId is required", 400)
  }

  const coachingId = await resolveCoachingIdForAdmin(coachingAdminUserId)

  const test = await prisma.test.findUnique({
    where: {
      id: testId,
    },
    select: {
      id: true,
      title: true,
      coachingId: true,
      testSections: {
        select: {
          id: true,
          sectionName: true,
        },
      },
      testQuestions: {
        select: {
          questionId: true,
          sectionId: true,
          question: {
            select: {
              questionText: true,
              subject: true,
              topic: true,
              difficulty: true,
              correctOption: true,
            },
          },
        },
      },
    },
  })

  if (!test) {
    throw createServiceError("test not found", 404)
  }

  if (test.coachingId !== coachingId) {
    throw createServiceError("forbidden", 403)
  }

  const [distinctAttempts, results, studentAnswers] = await Promise.all([
    prisma.examAttempt.findMany({
      where: {
        testId,
        isSubmitted: true,
      },
      distinct: ["studentId"],
      select: {
        studentId: true,
      },
    }),
    prisma.result.findMany({
      where: {
        testId,
      },
      select: {
        totalScore: true,
        accuracyPercentage: true,
      },
    }),
    prisma.studentAnswer.findMany({
      where: {
        examAttempt: {
          testId,
          isSubmitted: true,
        },
      },
      select: {
        questionId: true,
        selectedOption: true,
      },
    }),
  ])

  const scores = results.map((item) => toNumber(item.totalScore))
  const averageScore = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0
  const highestScore = scores.length ? Math.max(...scores) : 0
  const lowestScore = scores.length ? Math.min(...scores) : 0
  const averageAccuracy =
    results.length
      ? results.reduce((sum, item) => sum + toNumber(item.accuracyPercentage), 0) / results.length
      : 0

  const distributionBuckets = [
    { range: "0-20", min: 0, max: 20, count: 0 },
    { range: "21-40", min: 21, max: 40, count: 0 },
    { range: "41-60", min: 41, max: 60, count: 0 },
    { range: "61-80", min: 61, max: 80, count: 0 },
    { range: "81-100", min: 81, max: 100, count: 0 },
  ]

  scores.forEach((score) => {
    const bucket = distributionBuckets.find((item) => score >= item.min && score <= item.max)
    if (bucket) {
      bucket.count += 1
    }
  })

  const sectionNameById = new Map(test.testSections.map((section) => [section.id, section.sectionName]))
  const questionMetaById = new Map(
    test.testQuestions.map((mapping) => [
      mapping.questionId,
      {
        sectionId: mapping.sectionId,
        questionText: mapping.question.questionText,
        subject: mapping.question.subject,
        topic: mapping.question.topic,
        difficulty: mapping.question.difficulty,
        correctOption: mapping.question.correctOption,
      },
    ]),
  )

  const sectionStats = new Map()
  const difficultyStats = {
    easy: { attempted: 0, correct: 0 },
    medium: { attempted: 0, correct: 0 },
    hard: { attempted: 0, correct: 0 },
  }
  const questionStats = new Map()

  studentAnswers.forEach((answer) => {
    const questionMeta = questionMetaById.get(answer.questionId)

    if (!questionMeta || !answer.selectedOption) {
      return
    }

    const isCorrect = answer.selectedOption === questionMeta.correctOption

    const sectionName = sectionNameById.get(questionMeta.sectionId) || "Unknown Section"
    const currentSection = sectionStats.get(sectionName) || { attempted: 0, correct: 0 }
    currentSection.attempted += 1
    if (isCorrect) {
      currentSection.correct += 1
    }
    sectionStats.set(sectionName, currentSection)

    if (difficultyStats[questionMeta.difficulty]) {
      difficultyStats[questionMeta.difficulty].attempted += 1
      if (isCorrect) {
        difficultyStats[questionMeta.difficulty].correct += 1
      }
    }

    const currentQuestion = questionStats.get(answer.questionId) || {
      attempted: 0,
      correct: 0,
      wrong: 0,
      question_text: questionMeta.questionText,
      subject: questionMeta.subject,
      topic: questionMeta.topic,
    }

    currentQuestion.attempted += 1

    if (isCorrect) {
      currentQuestion.correct += 1
    } else {
      currentQuestion.wrong += 1
    }

    questionStats.set(answer.questionId, currentQuestion)
  })

  const sectionPerformance = Array.from(sectionStats.entries()).map(([sectionName, value]) => ({
    section_name: sectionName,
    attempted: value.attempted,
    accuracy_percentage: toPercent(value.correct, value.attempted),
  }))

  const difficultyAnalysis = Object.entries(difficultyStats).map(([difficulty, value]) => ({
    difficulty,
    attempted: value.attempted,
    correct: value.correct,
    accuracy_percentage: toPercent(value.correct, value.attempted),
  }))

  const questionStatsList = Array.from(questionStats.entries()).map(([questionId, value]) => ({
    question_id: questionId,
    question_text: value.question_text,
    subject: value.subject,
    topic: value.topic,
    attempted_count: value.attempted,
    wrong_count: value.wrong,
    accuracy_percentage: toPercent(value.correct, value.attempted),
  }))

  const { page, limit, topN } = normalizeListQuery(query)

  const mostIncorrectQuestions = [...questionStatsList]
    .sort((a, b) => b.wrong_count - a.wrong_count || b.attempted_count - a.attempted_count)

  const mostAttemptedQuestions = [...questionStatsList]
    .sort((a, b) => b.attempted_count - a.attempted_count)

  const pagedIncorrectQuestions = topN
    ? mostIncorrectQuestions.slice(0, topN)
    : mostIncorrectQuestions.slice((page - 1) * limit, page * limit)

  const pagedAttemptedQuestions = topN
    ? mostAttemptedQuestions.slice(0, topN)
    : mostAttemptedQuestions.slice((page - 1) * limit, page * limit)

  return {
    test: {
      id: test.id,
      title: test.title,
    },
    metrics: {
      total_students_attempted: distinctAttempts.length,
      average_score: Number(averageScore.toFixed(2)),
      highest_score: Number(highestScore.toFixed(2)),
      lowest_score: Number(lowestScore.toFixed(2)),
      accuracy_percentage: Number(averageAccuracy.toFixed(2)),
    },
    score_distribution: distributionBuckets.map((item) => ({
      range: item.range,
      count: item.count,
    })),
    section_performance: sectionPerformance,
    difficulty_analysis: difficultyAnalysis,
    most_incorrect_questions: pagedIncorrectQuestions,
    most_attempted_questions: pagedAttemptedQuestions,
    question_analytics: {
      top_n: topN,
      incorrect_questions: {
        items: pagedIncorrectQuestions,
        pagination: topN
          ? buildPaginationMeta(mostIncorrectQuestions.length, 1, topN)
          : buildPaginationMeta(mostIncorrectQuestions.length, page, limit),
      },
      attempted_questions: {
        items: pagedAttemptedQuestions,
        pagination: topN
          ? buildPaginationMeta(mostAttemptedQuestions.length, 1, topN)
          : buildPaginationMeta(mostAttemptedQuestions.length, page, limit),
      },
    },
  }
}

const resolvePendingStudentForAdmin = async (studentId, coachingAdminUserId) => {
  const coachingId = await resolveCoachingIdForAdmin(coachingAdminUserId)

  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
    },
    select: {
      id: true,
      coachingId: true,
      status: true,
    },
  })

  if (!student) {
    throw createServiceError("student not found", 404)
  }

  if (student.coachingId !== coachingId) {
    throw createServiceError("forbidden", 403)
  }

  if (student.status !== "pending") {
    throw createServiceError("student is not in pending state", 400)
  }

  return student.id
}

const approveStudent = async (studentId, coachingAdminUserId) => {
  const resolvedStudentId = await resolvePendingStudentForAdmin(studentId, coachingAdminUserId)

  const approvedStudent = await prisma.student.update({
    where: {
      id: resolvedStudentId,
    },
    data: {
      status: "approved",
      approvedBy: coachingAdminUserId,
      approvedAt: new Date(),
      rejectionReason: null,
    },
    select: {
      id: true,
      name: true,
      status: true,
      approvedAt: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  })

  if (approvedStudent.user?.email) {
    await sendStudentApprovalEmail({
      toEmail: approvedStudent.user.email,
      studentName: approvedStudent.name,
    })
  }

  return {
    id: approvedStudent.id,
    name: approvedStudent.name,
    status: approvedStudent.status,
    approvedAt: approvedStudent.approvedAt,
  }
}

const rejectStudent = async (studentId, coachingAdminUserId) => {
  const resolvedStudentId = await resolvePendingStudentForAdmin(studentId, coachingAdminUserId)

  const rejectedStudent = await prisma.student.update({
    where: {
      id: resolvedStudentId,
    },
    data: {
      status: "rejected",
      approvedBy: coachingAdminUserId,
      approvedAt: new Date(),
      rejectionReason: "Rejected by coaching admin",
    },
    select: {
      id: true,
      name: true,
      status: true,
      approvedAt: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  })

  if (rejectedStudent.user?.email) {
    await sendStudentRejectionEmail({
      toEmail: rejectedStudent.user.email,
      studentName: rejectedStudent.name,
    })
  }

  return {
    id: rejectedStudent.id,
    name: rejectedStudent.name,
    status: rejectedStudent.status,
    approvedAt: rejectedStudent.approvedAt,
  }
}

module.exports = {
  getPendingStudents,
  getStudents,
  getStudentProfile,
  getDashboardAnalytics,
  getTestAnalytics,
  approveStudent,
  rejectStudent,
}
