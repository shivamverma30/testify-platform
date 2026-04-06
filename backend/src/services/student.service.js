const prisma = require("../../db")
const { hashPassword, comparePassword } = require("../utils/hash")

const MAX_RECENT_RESULTS = 5

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
    },
  })

  if (!student) {
    throw createServiceError("student profile not found", 403)
  }

  return student
}

const mapTestForStudent = (test) => {
  const now = new Date()
  const hasStarted = Boolean(test.scheduledStart && test.scheduledStart <= now)

  return {
    id: test.id,
    test_series_id: test.testSeriesId,
    title: test.title,
    type: test.type,
    total_questions: test.totalQuestions,
    total_marks: test.totalMarks,
    duration_minutes: test.durationMinutes,
    is_active: test.isActive,
    scheduled_start: test.scheduledStart,
    scheduled_end: test.scheduledEnd,
    can_attempt_now: hasStarted,
    created_at: test.createdAt,
    updated_at: test.updatedAt,
  }
}

const getStudentByUserId = async (userId) => {
  return prisma.student.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      userId: true,
      name: true,
      phoneNumber: true,
      examPreparingFor: true,
      coachingId: true,
      coachingInstitute: {
        select: {
          id: true,
          instituteName: true,
        },
      },
    },
  })
}

const resolveOwnedResult = async (resultId, studentId) => {
  const result = await prisma.result.findUnique({
    where: {
      id: resultId,
    },
    select: {
      id: true,
      studentId: true,
      testId: true,
      attemptId: true,
      totalScore: true,
      correctCount: true,
      wrongCount: true,
      unattemptedCount: true,
      accuracyPercentage: true,
      rank: true,
      generatedAt: true,
      test: {
        select: {
          id: true,
          title: true,
          totalQuestions: true,
          totalMarks: true,
          durationMinutes: true,
          scheduledStart: true,
          testQuestions: {
            orderBy: {
              orderIndex: "asc",
            },
            select: {
              questionId: true,
              orderIndex: true,
              question: {
                select: {
                  questionText: true,
                  subject: true,
                  topic: true,
                  correctOption: true,
                },
              },
            },
          },
          coachingInstitute: {
            select: {
              instituteName: true,
            },
          },
        },
      },
      examAttempt: {
        select: {
          startedAt: true,
          submittedAt: true,
          studentAnswers: {
            select: {
              questionId: true,
              selectedOption: true,
              question: {
                select: {
                  subject: true,
                  topic: true,
                  correctOption: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!result) {
    throw createServiceError("result not found", 404)
  }

  if (result.studentId !== studentId) {
    throw createServiceError("forbidden", 403)
  }

  return result
}

const buildStatusFromSchedule = ({ scheduledStart, scheduledEnd, hasCompleted }) => {
  const now = new Date()

  if (hasCompleted) {
    return "completed"
  }

  if (scheduledStart && scheduledStart > now) {
    return "not_started"
  }

  if (scheduledStart && scheduledStart <= now && scheduledEnd && scheduledEnd >= now) {
    return "available_to_attempt"
  }

  return "not_started"
}

const getDashboardOverview = async (user) => {
  const student = await resolveStudentContext(user)
  const now = new Date()

  const [upcomingTests, recentResults, attemptsAggregate] = await Promise.all([
    prisma.test.findMany({
      where: {
        coachingId: student.coachingId,
        isActive: true,
        scheduledStart: {
          gte: now,
        },
      },
      orderBy: {
        scheduledStart: "asc",
      },
      take: 5,
      select: {
        id: true,
        title: true,
        durationMinutes: true,
        scheduledStart: true,
        scheduledEnd: true,
        coachingInstitute: {
          select: {
            instituteName: true,
          },
        },
      },
    }),
    prisma.result.findMany({
      where: {
        studentId: student.id,
      },
      orderBy: {
        generatedAt: "desc",
      },
      take: MAX_RECENT_RESULTS,
      select: {
        id: true,
        totalScore: true,
        rank: true,
        accuracyPercentage: true,
        generatedAt: true,
        test: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.result.aggregate({
      where: {
        studentId: student.id,
      },
      _count: {
        id: true,
      },
      _avg: {
        totalScore: true,
        accuracyPercentage: true,
      },
      _max: {
        totalScore: true,
      },
    }),
  ])

  return {
    upcoming_tests: upcomingTests.map((test) => ({
      id: test.id,
      test_name: test.title,
      coaching_name: test.coachingInstitute?.instituteName || "",
      test_date: test.scheduledStart,
      test_time: test.scheduledStart,
      duration_minutes: test.durationMinutes,
      can_attempt_now: Boolean(test.scheduledStart && test.scheduledStart <= now),
    })),
    recent_results: recentResults.map((result) => ({
      id: result.id,
      test_id: result.test.id,
      test_name: result.test.title,
      score: Number(result.totalScore),
      rank: result.rank,
      accuracy: Number(result.accuracyPercentage),
      generated_at: result.generatedAt,
    })),
    performance_summary: {
      total_tests_attempted: attemptsAggregate._count.id,
      average_score: Number(attemptsAggregate._avg.totalScore || 0),
      highest_score: Number(attemptsAggregate._max.totalScore || 0),
      accuracy_percentage: Number(attemptsAggregate._avg.accuracyPercentage || 0),
    },
  }
}

const getScheduledTests = async (user) => {
  const student = await resolveStudentContext(user)

  const [tests, completedAttempts] = await Promise.all([
    prisma.test.findMany({
      where: {
        coachingId: student.coachingId,
        isActive: true,
        scheduledStart: {
          not: null,
        },
      },
      orderBy: {
        scheduledStart: "asc",
      },
      select: {
        id: true,
        title: true,
        type: true,
        totalQuestions: true,
        durationMinutes: true,
        scheduledStart: true,
        scheduledEnd: true,
      },
    }),
    prisma.examAttempt.findMany({
      where: {
        studentId: student.id,
        isSubmitted: true,
      },
      select: {
        testId: true,
      },
      distinct: ["testId"],
    }),
  ])

  const completedTestIdSet = new Set(completedAttempts.map((attempt) => attempt.testId))

  return tests.map((test) => ({
    id: test.id,
    test_name: test.title,
    test_type: test.type,
    total_questions: test.totalQuestions,
    duration_minutes: test.durationMinutes,
    scheduled_time: test.scheduledStart,
    status: buildStatusFromSchedule({
      scheduledStart: test.scheduledStart,
      scheduledEnd: test.scheduledEnd,
      hasCompleted: completedTestIdSet.has(test.id),
    }),
  }))
}

const getAttemptHistory = async (user) => {
  const student = await resolveStudentContext(user)

  const attempts = await prisma.examAttempt.findMany({
    where: {
      studentId: student.id,
    },
    orderBy: {
      startedAt: "desc",
    },
    select: {
      id: true,
      startedAt: true,
      submittedAt: true,
      isSubmitted: true,
      score: true,
      test: {
        select: {
          id: true,
          title: true,
        },
      },
      result: {
        select: {
          id: true,
          rank: true,
        },
      },
    },
  })

  return attempts.map((attempt) => ({
    id: attempt.id,
    result_id: attempt.result?.id || null,
    test_id: attempt.test.id,
    test_name: attempt.test.title,
    attempt_date: attempt.submittedAt || attempt.startedAt,
    score: attempt.score ? Number(attempt.score) : null,
    rank: attempt.result?.rank || null,
    status: attempt.isSubmitted ? "completed" : "in_progress",
  }))
}

const getResultsList = async (user) => {
  const student = await resolveStudentContext(user)

  const results = await prisma.result.findMany({
    where: {
      studentId: student.id,
    },
    orderBy: {
      generatedAt: "desc",
    },
    select: {
      id: true,
      totalScore: true,
      rank: true,
      accuracyPercentage: true,
      correctCount: true,
      wrongCount: true,
      unattemptedCount: true,
      generatedAt: true,
      test: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  return results.map((result) => ({
    id: result.id,
    test_id: result.test.id,
    test_name: result.test.title,
    score: Number(result.totalScore),
    rank: result.rank,
    accuracy: Number(result.accuracyPercentage),
    correct_answers: result.correctCount,
    wrong_answers: result.wrongCount,
    unattempted_questions: result.unattemptedCount,
    generated_at: result.generatedAt,
  }))
}

const getResultById = async (resultId, user) => {
  const student = await resolveStudentContext(user)
  const result = await resolveOwnedResult(resultId, student.id)

  const subjectMap = new Map()
  const topicMap = new Map()

  result.examAttempt.studentAnswers.forEach((answer) => {
    if (!answer.selectedOption) {
      return
    }

    const subject = answer.question.subject
    const topic = answer.question.topic
    const isCorrect = answer.selectedOption === answer.question.correctOption

    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, { attempted: 0, correct: 0 })
    }
    if (!topicMap.has(topic)) {
      topicMap.set(topic, { attempted: 0, correct: 0 })
    }

    const subjectStats = subjectMap.get(subject)
    subjectStats.attempted += 1
    if (isCorrect) {
      subjectStats.correct += 1
    }

    const topicStats = topicMap.get(topic)
    topicStats.attempted += 1
    if (isCorrect) {
      topicStats.correct += 1
    }
  })

  const answerByQuestionId = new Map(
    result.examAttempt.studentAnswers.map((item) => [item.questionId, item.selectedOption]),
  )

  const questionWiseAnalysis = result.test.testQuestions.map((item) => {
    const selectedOption = answerByQuestionId.get(item.questionId) || null
    const correctOption = item.question.correctOption

    return {
      question_id: item.questionId,
      question_number: item.orderIndex,
      question_text: item.question.questionText,
      subject: item.question.subject,
      topic: item.question.topic,
      student_answer: selectedOption,
      correct_answer: correctOption,
      is_correct: Boolean(selectedOption && selectedOption === correctOption),
      status: selectedOption ? "attempted" : "unattempted",
    }
  })

  return {
    id: result.id,
    test_id: result.testId,
    test_name: result.test.title,
    coaching_name: result.test.coachingInstitute?.instituteName || "",
    total_questions: result.test.totalQuestions,
    total_marks: result.test.totalMarks,
    duration_minutes: result.test.durationMinutes,
    scheduled_start: result.test.scheduledStart,
    attempt_id: result.attemptId,
    started_at: result.examAttempt.startedAt,
    submitted_at: result.examAttempt.submittedAt,
    total_score: Number(result.totalScore),
    correct_answers: result.correctCount,
    wrong_answers: result.wrongCount,
    unattempted_questions: result.unattemptedCount,
    accuracy_percentage: Number(result.accuracyPercentage),
    rank: result.rank,
    generated_at: result.generatedAt,
    subject_wise_performance: Array.from(subjectMap.entries()).map(([subject, value]) => ({
      subject,
      attempted: value.attempted,
      accuracy_percentage: value.attempted ? Number(((value.correct / value.attempted) * 100).toFixed(2)) : 0,
    })),
    topic_wise_accuracy: Array.from(topicMap.entries()).map(([topic, value]) => ({
      topic,
      attempted: value.attempted,
      accuracy_percentage: value.attempted ? Number(((value.correct / value.attempted) * 100).toFixed(2)) : 0,
    })),
    question_wise_analysis: questionWiseAnalysis,
  }
}

const getPerformanceAnalytics = async (user) => {
  const student = await resolveStudentContext(user)

  const [results, answers] = await Promise.all([
    prisma.result.findMany({
      where: {
        studentId: student.id,
      },
      orderBy: {
        generatedAt: "asc",
      },
      select: {
        id: true,
        totalScore: true,
        accuracyPercentage: true,
        generatedAt: true,
        test: {
          select: {
            title: true,
          },
        },
      },
    }),
    prisma.studentAnswer.findMany({
      where: {
        examAttempt: {
          studentId: student.id,
          isSubmitted: true,
        },
        selectedOption: {
          not: null,
        },
      },
      select: {
        selectedOption: true,
        question: {
          select: {
            subject: true,
            topic: true,
            correctOption: true,
          },
        },
      },
    }),
  ])

  const subjectStats = new Map()
  const topicStats = new Map()

  answers.forEach((answer) => {
    const subject = answer.question.subject
    const topic = answer.question.topic
    const isCorrect = answer.selectedOption === answer.question.correctOption

    if (!subjectStats.has(subject)) {
      subjectStats.set(subject, { attempted: 0, correct: 0 })
    }
    if (!topicStats.has(topic)) {
      topicStats.set(topic, { attempted: 0, correct: 0 })
    }

    const subjectValue = subjectStats.get(subject)
    subjectValue.attempted += 1
    if (isCorrect) {
      subjectValue.correct += 1
    }

    const topicValue = topicStats.get(topic)
    topicValue.attempted += 1
    if (isCorrect) {
      topicValue.correct += 1
    }
  })

  const topicAccuracy = Array.from(topicStats.entries()).map(([topic, value]) => ({
    topic,
    attempted: value.attempted,
    accuracy_percentage: value.attempted ? Number(((value.correct / value.attempted) * 100).toFixed(2)) : 0,
  }))

  const sortedTopics = [...topicAccuracy].sort((a, b) => a.accuracy_percentage - b.accuracy_percentage)

  return {
    score_trend: results.map((result) => ({
      label: result.test.title,
      score: Number(result.totalScore),
      accuracy: Number(result.accuracyPercentage),
      generated_at: result.generatedAt,
    })),
    subject_wise_performance: Array.from(subjectStats.entries()).map(([subject, value]) => ({
      subject,
      attempted: value.attempted,
      accuracy_percentage: value.attempted ? Number(((value.correct / value.attempted) * 100).toFixed(2)) : 0,
    })),
    topic_wise_accuracy: topicAccuracy,
    weak_topics: sortedTopics.slice(0, 5),
    strong_topics: sortedTopics.reverse().slice(0, 5),
  }
}

const getMyTestSeries = async (user) => {
  const student = await resolveStudentContext(user)

  const purchases = await prisma.purchase.findMany({
    where: {
      studentId: student.id,
      paymentStatus: "success",
    },
    orderBy: {
      purchasedAt: "desc",
    },
    select: {
      id: true,
      amountPaid: true,
      purchasedAt: true,
      testSeries: {
        select: {
          id: true,
          name: true,
          totalTests: true,
          coachingInstitute: {
            select: {
              instituteName: true,
            },
          },
          tests: {
            where: {
              isActive: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              title: true,
              type: true,
              totalQuestions: true,
              durationMinutes: true,
              scheduledStart: true,
            },
          },
        },
      },
    },
  })

  return purchases.map((purchase) => ({
    id: purchase.id,
    test_series_id: purchase.testSeries.id,
    series_name: purchase.testSeries.name,
    coaching_name: purchase.testSeries.coachingInstitute?.instituteName || "",
    number_of_tests: purchase.testSeries.totalTests,
    price: Number(purchase.amountPaid),
    purchase_date: purchase.purchasedAt,
    tests: purchase.testSeries.tests.map((test) => ({
      id: test.id,
      title: test.title,
      type: test.type,
      total_questions: test.totalQuestions,
      duration_minutes: test.durationMinutes,
      scheduled_start: test.scheduledStart,
    })),
  }))
}

const getExploreTestSeries = async () => {
  const series = await prisma.testSeries.findMany({
    where: {
      isPublic: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      totalTests: true,
      price: true,
      createdAt: true,
      coachingInstitute: {
        select: {
          id: true,
          instituteName: true,
        },
      },
    },
  })

  return series.map((item) => ({
    id: item.id,
    series_name: item.name,
    coaching_name: item.coachingInstitute?.instituteName || "",
    coaching_id: item.coachingInstitute?.id || null,
    number_of_tests: item.totalTests,
    price: Number(item.price),
    created_at: item.createdAt,
  }))
}

const purchaseTestSeries = async (payload, user) => {
  const student = await resolveStudentContext(user)
  const testSeriesId = payload.test_series_id || payload.testSeriesId
  const paymentId = payload.payment_id || payload.paymentId

  if (!testSeriesId || !paymentId) {
    throw createServiceError("test_series_id and payment_id are required", 400)
  }

  const series = await prisma.testSeries.findUnique({
    where: {
      id: testSeriesId,
    },
    select: {
      id: true,
      isPublic: true,
      price: true,
    },
  })

  if (!series || !series.isPublic) {
    throw createServiceError("public test series not found", 404)
  }

  const purchase = await prisma.purchase.upsert({
    where: {
      studentId_testSeriesId: {
        studentId: student.id,
        testSeriesId,
      },
    },
    update: {
      paymentId,
      paymentStatus: "success",
      amountPaid: series.price,
      purchasedAt: new Date(),
    },
    create: {
      studentId: student.id,
      testSeriesId,
      paymentId,
      paymentStatus: "success",
      amountPaid: series.price,
    },
    select: {
      id: true,
      studentId: true,
      testSeriesId: true,
      amountPaid: true,
      paymentId: true,
      paymentStatus: true,
      purchasedAt: true,
    },
  })

  return {
    id: purchase.id,
    student_id: purchase.studentId,
    test_series_id: purchase.testSeriesId,
    amount_paid: Number(purchase.amountPaid),
    payment_id: purchase.paymentId,
    payment_status: purchase.paymentStatus,
    purchase_date: purchase.purchasedAt,
  }
}

const getStudentProfile = async (user) => {
  const student = await getStudentByUserId(user.id)

  if (!student) {
    throw createServiceError("student profile not found", 403)
  }

  return {
    id: student.id,
    name: student.name,
    phone_number: student.phoneNumber,
    exam_preparing_for: student.examPreparingFor,
    coaching_id: student.coachingId,
    coaching_name: student.coachingInstitute?.instituteName || "",
  }
}

const updateStudentProfile = async (payload, user) => {
  const student = await getStudentByUserId(user.id)

  if (!student) {
    throw createServiceError("student profile not found", 403)
  }

  const updateData = {}

  if (payload.name !== undefined) {
    const name = String(payload.name || "").trim()
    if (!name) {
      throw createServiceError("name cannot be empty", 400)
    }
    updateData.name = name
  }

  if (payload.phone_number !== undefined || payload.phoneNumber !== undefined) {
    const phoneNumber = String(payload.phone_number || payload.phoneNumber || "").trim()
    if (!phoneNumber) {
      throw createServiceError("phone_number cannot be empty", 400)
    }
    updateData.phoneNumber = phoneNumber
  }

  if (payload.exam_preparing_for !== undefined || payload.examPreparingFor !== undefined) {
    const examPreparingFor = String(
      payload.exam_preparing_for || payload.examPreparingFor || "",
    ).trim()
    if (!examPreparingFor) {
      throw createServiceError("exam_preparing_for cannot be empty", 400)
    }
    updateData.examPreparingFor = examPreparingFor
  }

  const currentPassword = payload.current_password || payload.currentPassword
  const newPassword = payload.new_password || payload.newPassword

  if (currentPassword || newPassword) {
    if (!currentPassword || !newPassword) {
      throw createServiceError("current_password and new_password are required together", 400)
    }

    if (String(newPassword).trim().length < 6) {
      throw createServiceError("new_password must be at least 6 characters", 400)
    }

    const userRecord = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        passwordHash: true,
      },
    })

    if (!userRecord) {
      throw createServiceError("user not found", 404)
    }

    const isCurrentPasswordValid = await comparePassword(currentPassword, userRecord.passwordHash)

    if (!isCurrentPasswordValid) {
      throw createServiceError("current_password is incorrect", 400)
    }

    const passwordHash = await hashPassword(String(newPassword).trim())

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    })
  }

  if (Object.keys(updateData).length) {
    await prisma.student.update({
      where: {
        id: student.id,
      },
      data: updateData,
    })
  }

  return getStudentProfile(user)
}

const getAvailableTests = async (user) => {
  const student = await resolveStudentContext(user)
  const now = new Date()

  const tests = await prisma.test.findMany({
    where: {
      coachingId: student.coachingId,
      isActive: true,
      scheduledStart: {
        lte: now,
      },
      scheduledEnd: {
        gte: now,
      },
    },
    orderBy: {
      scheduledStart: "asc",
    },
    select: {
      id: true,
      testSeriesId: true,
      title: true,
      type: true,
      totalQuestions: true,
      totalMarks: true,
      durationMinutes: true,
      isActive: true,
      scheduledStart: true,
      scheduledEnd: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return tests.map(mapTestForStudent)
}

const getUpcomingTests = async (user) => {
  const student = await resolveStudentContext(user)
  const now = new Date()

  const tests = await prisma.test.findMany({
    where: {
      coachingId: student.coachingId,
      scheduledStart: {
        gt: now,
      },
    },
    orderBy: {
      scheduledStart: "asc",
    },
    select: {
      id: true,
      testSeriesId: true,
      title: true,
      type: true,
      totalQuestions: true,
      totalMarks: true,
      durationMinutes: true,
      isActive: true,
      scheduledStart: true,
      scheduledEnd: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return tests.map(mapTestForStudent)
}

const getPastTests = async (user) => {
  const student = await resolveStudentContext(user)
  const now = new Date()

  const tests = await prisma.test.findMany({
    where: {
      coachingId: student.coachingId,
      scheduledEnd: {
        lt: now,
      },
    },
    orderBy: {
      scheduledEnd: "desc",
    },
    select: {
      id: true,
      testSeriesId: true,
      title: true,
      type: true,
      totalQuestions: true,
      totalMarks: true,
      durationMinutes: true,
      isActive: true,
      scheduledStart: true,
      scheduledEnd: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return tests.map(mapTestForStudent)
}

const registerStudent = async (payload) => {
  const name = payload.name
  const email = payload.email
  const password = payload.password
  const coachingId = payload.coaching_id || payload.coachingId
  const phoneNumber = payload.phone_number || payload.phoneNumber
  const examPreparingFor = payload.exam_preparing_for || payload.examPreparingFor

  if (!name || !email || !password || !coachingId || !phoneNumber || !examPreparingFor) {
    throw createServiceError(
      "name, email, password, coaching_id, phone_number and exam_preparing_for are required",
      400,
    )
  }

  const normalizedEmail = email.trim().toLowerCase()

  const [existingUser, coachingInstitute] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
    prisma.coachingInstitute.findUnique({ where: { id: coachingId }, select: { id: true } }),
  ])

  if (existingUser) {
    throw createServiceError("email already exists", 409)
  }

  if (!coachingInstitute) {
    throw createServiceError("coaching institute not found", 404)
  }

  const passwordHash = await hashPassword(password)

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "student",
      },
    })

    const student = await tx.student.create({
      data: {
        userId: user.id,
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        coachingId,
        examPreparingFor: examPreparingFor.trim(),
      },
      select: {
        id: true,
        name: true,
        coachingId: true,
        status: true,
        createdAt: true,
      },
    })

    return student
  })

  return {
    id: result.id,
    name: result.name,
    coaching_id: result.coachingId,
    status: result.status,
    created_at: result.createdAt,
  }
}

module.exports = {
  registerStudent,
  getAvailableTests,
  getUpcomingTests,
  getPastTests,
  getDashboardOverview,
  getScheduledTests,
  getAttemptHistory,
  getResultsList,
  getResultById,
  getPerformanceAnalytics,
  getMyTestSeries,
  getExploreTestSeries,
  purchaseTestSeries,
  getStudentProfile,
  updateStudentProfile,
}
