const prisma = require("../../db")
const { sendTestScheduledEmail } = require("./email.service")

const ALLOWED_TEST_TYPES = ["topic_wise", "full_length"]
const ALLOWED_VISIBILITY_VALUES = ["public", "private"]

const createServiceError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const resolveCoachingId = async (user) => {
  if (user.coaching_id) {
    return user.coaching_id
  }

  const coachingInstitute = await prisma.coachingInstitute.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
    },
  })

  if (!coachingInstitute) {
    throw createServiceError("coaching institute not found for admin", 403)
  }

  return coachingInstitute.id
}

const getOwnedTest = async (testId, coachingId) => {
  const test = await prisma.test.findUnique({
    where: {
      id: testId,
    },
    select: {
      id: true,
      coachingId: true,
    },
  })

  if (!test) {
    throw createServiceError("test not found", 404)
  }

  if (test.coachingId !== coachingId) {
    throw createServiceError("forbidden", 403)
  }

  return test
}

const getOwnedSection = async (sectionId, coachingId) => {
  const section = await prisma.testSection.findUnique({
    where: {
      id: sectionId,
    },
    select: {
      id: true,
      testId: true,
      questionCount: true,
      test: {
        select: {
          coachingId: true,
          totalQuestions: true,
        },
      },
    },
  })

  if (!section) {
    throw createServiceError("section not found", 404)
  }

  if (section.test.coachingId !== coachingId) {
    throw createServiceError("forbidden", 403)
  }

  return section
}

const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createServiceError(`${fieldName} must be a positive integer`, 400)
  }

  return parsed
}

const parseScheduleDate = (value, fieldName) => {
  if (!value) {
    throw createServiceError(`${fieldName} is required`, 400)
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw createServiceError(`${fieldName} must be a valid datetime`, 400)
  }

  return parsed
}

const parsePrice = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createServiceError("price must be a non-negative number", 400)
  }

  return parsed
}

const resolveOwnedTests = async (coachingId, testIds = []) => {
  if (!Array.isArray(testIds)) {
    throw createServiceError("selected_test_ids must be an array", 400)
  }

  if (!testIds.length) {
    return []
  }

  const uniqueTestIds = [...new Set(testIds)]

  const tests = await prisma.test.findMany({
    where: {
      id: {
        in: uniqueTestIds,
      },
      coachingId,
    },
    select: {
      id: true,
    },
  })

  if (tests.length !== uniqueTestIds.length) {
    throw createServiceError("one or more selected tests are invalid", 400)
  }

  return uniqueTestIds
}

const mapSeries = (series) => ({
  id: series.id,
  coaching_id: series.coachingId,
  series_name: series.name,
  description: series.description,
  exam_type: series.examType,
  subjects_covered: series.subjectsCovered,
  total_tests: series.totalTests,
  price: Number(series.price),
  visibility: series.isPublic ? "public" : "private",
  created_at: series.createdAt,
  updated_at: series.updatedAt,
  tests:
    series.tests?.map((test) => ({
      id: test.id,
      title: test.title,
      type: test.type,
      total_questions: test.totalQuestions,
      duration_minutes: test.durationMinutes,
    })) || [],
})

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

const assertStudentCanAccessLeaderboard = async (student, test) => {
  if (student.coachingId === test.coachingId) {
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
    throw createServiceError("you are not allowed to view this leaderboard", 403)
  }
}

const normalizeListQuery = (query = {}) => {
  const parsedPage = Number(query.page)
  const parsedLimit = Number(query.limit)
  const parsedTopN = Number(query.top_n || query.topN)

  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20
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

const getTestLeaderboard = async (testId, user, query = {}) => {
  if (!testId) {
    throw createServiceError("testId is required", 400)
  }

  const test = await prisma.test.findUnique({
    where: {
      id: testId,
    },
    select: {
      id: true,
      title: true,
      coachingId: true,
      testSeriesId: true,
    },
  })

  if (!test) {
    throw createServiceError("test not found", 404)
  }

  let currentStudentId = null

  if (user.role === "coaching_admin") {
    const coachingId = await resolveCoachingId(user)
    if (test.coachingId !== coachingId) {
      throw createServiceError("forbidden", 403)
    }
  } else if (user.role === "student") {
    const student = await resolveStudentContext(user)
    await assertStudentCanAccessLeaderboard(student, test)
    currentStudentId = student.id
  } else {
    throw createServiceError("forbidden", 403)
  }

  const { page, limit, topN } = normalizeListQuery(query)

  const results = await prisma.result.findMany({
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
      studentId: true,
      totalScore: true,
      accuracyPercentage: true,
      generatedAt: true,
      student: {
        select: {
          name: true,
        },
      },
    },
  })

  let currentRank = 0
  let previousScore = null
  let previousAccuracy = null
  let myRank = null

  const fullLeaderboard = results.map((item, index) => {
    const score = Number(item.totalScore)
    const accuracy = Number(item.accuracyPercentage)

    if (score !== previousScore || accuracy !== previousAccuracy) {
      currentRank = index + 1
      previousScore = score
      previousAccuracy = accuracy
    }

    if (currentStudentId && item.studentId === currentStudentId) {
      myRank = currentRank
    }

    return {
      rank: currentRank,
      student_id: item.studentId,
      student_name: item.student.name,
      total_score: score,
      accuracy_percentage: accuracy,
      generated_at: item.generatedAt,
      result_id: item.id,
    }
  })

  const totalParticipants = fullLeaderboard.length
  const pagedLeaderboard = topN
    ? fullLeaderboard.slice(0, topN)
    : fullLeaderboard.slice((page - 1) * limit, page * limit)

  return {
    test_id: test.id,
    test_name: test.title,
    total_participants: totalParticipants,
    my_rank: myRank,
    query: {
      top_n: topN,
    },
    pagination: topN ? buildPaginationMeta(totalParticipants, 1, topN) : buildPaginationMeta(totalParticipants, page, limit),
    leaderboard: pagedLeaderboard,
  }
}

const createTest = async (payload, user) => {
  const coachingId = await resolveCoachingId(user)

  const title = payload.title?.trim()
  const durationMinutes = parsePositiveInt(payload.duration_minutes, "duration_minutes")
  const totalMarks = parsePositiveInt(payload.total_marks, "total_marks")
  const testSeriesId = payload.test_series_id || null
  const testType = payload.test_type || payload.type || "full_length"

  if (!title) {
    throw createServiceError("title is required", 400)
  }

  if (!ALLOWED_TEST_TYPES.includes(testType)) {
    throw createServiceError("test_type must be topic_wise or full_length", 400)
  }

  if (testSeriesId) {
    const testSeries = await prisma.testSeries.findUnique({
      where: {
        id: testSeriesId,
      },
      select: {
        id: true,
        coachingId: true,
      },
    })

    if (!testSeries) {
      throw createServiceError("test series not found", 404)
    }

    if (testSeries.coachingId !== coachingId) {
      throw createServiceError("forbidden", 403)
    }
  }

  const test = await prisma.test.create({
    data: {
      coachingId,
      testSeriesId,
      title,
      type: testType,
      totalQuestions: 0,
      totalMarks,
      durationMinutes,
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
      createdAt: true,
    },
  })

  return {
    id: test.id,
    coaching_id: test.coachingId,
    test_series_id: test.testSeriesId,
    title: test.title,
    type: test.type,
    total_questions: test.totalQuestions,
    total_marks: test.totalMarks,
    duration_minutes: test.durationMinutes,
    created_at: test.createdAt,
  }
}

const getTests = async (user) => {
  const coachingId = await resolveCoachingId(user)

  const tests = await prisma.test.findMany({
    where: {
      coachingId,
    },
    orderBy: {
      createdAt: "desc",
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
      createdAt: true,
      updatedAt: true,
    },
  })

  return tests.map((test) => ({
    id: test.id,
    coaching_id: test.coachingId,
    test_series_id: test.testSeriesId,
    title: test.title,
    type: test.type,
    total_questions: test.totalQuestions,
    total_marks: test.totalMarks,
    duration_minutes: test.durationMinutes,
    scheduled_start: test.scheduledStart,
    scheduled_end: test.scheduledEnd,
    created_at: test.createdAt,
    updated_at: test.updatedAt,
  }))
}

const updateTestSchedule = async (testId, payload, user) => {
  const coachingId = await resolveCoachingId(user)

  const scheduledStart = parseScheduleDate(
    payload.scheduled_start || payload.scheduledStart,
    "scheduled_start",
  )
  const scheduledEnd = parseScheduleDate(
    payload.scheduled_end || payload.scheduledEnd,
    "scheduled_end",
  )

  if (scheduledEnd <= scheduledStart) {
    throw createServiceError("scheduled_end must be greater than scheduled_start", 400)
  }

  const test = await prisma.test.findUnique({
    where: {
      id: testId,
    },
    select: {
      id: true,
      coachingId: true,
      scheduledStart: true,
      scheduledEnd: true,
      isActive: true,
      title: true,
      durationMinutes: true,
      type: true,
      totalQuestions: true,
      totalMarks: true,
      updatedAt: true,
    },
  })

  if (!test) {
    throw createServiceError("test not found", 404)
  }

  if (test.coachingId !== coachingId) {
    throw createServiceError("forbidden", 403)
  }

  const now = new Date()

  if (test.scheduledStart && now >= test.scheduledStart) {
    throw createServiceError("cannot update schedule after test has started", 400)
  }

  const updatedTest = await prisma.test.update({
    where: {
      id: testId,
    },
    data: {
      scheduledStart,
      scheduledEnd,
    },
    select: {
      id: true,
      coachingId: true,
      title: true,
      type: true,
      totalQuestions: true,
      totalMarks: true,
      durationMinutes: true,
      isActive: true,
      scheduledStart: true,
      scheduledEnd: true,
      updatedAt: true,
    },
  })

  const approvedStudents = await prisma.student.findMany({
    where: {
      coachingId,
      status: "approved",
    },
    select: {
      name: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  })

  await Promise.all(
    approvedStudents
      .filter((student) => Boolean(student.user?.email))
      .map((student) =>
        sendTestScheduledEmail({
          toEmail: student.user.email,
          studentName: student.name,
          testTitle: updatedTest.title,
          scheduledStart: updatedTest.scheduledStart,
          scheduledEnd: updatedTest.scheduledEnd,
        }),
      ),
  )

  return {
    id: updatedTest.id,
    coaching_id: updatedTest.coachingId,
    title: updatedTest.title,
    type: updatedTest.type,
    total_questions: updatedTest.totalQuestions,
    total_marks: updatedTest.totalMarks,
    duration_minutes: updatedTest.durationMinutes,
    is_active: updatedTest.isActive,
    scheduled_start: updatedTest.scheduledStart,
    scheduled_end: updatedTest.scheduledEnd,
    updated_at: updatedTest.updatedAt,
  }
}

const updateTest = async (testId, payload, user) => {
  const coachingId = await resolveCoachingId(user)
  await getOwnedTest(testId, coachingId)

  const updateData = {}

  if (payload.title !== undefined) {
    const title = payload.title?.trim()
    if (!title) {
      throw createServiceError("title cannot be empty", 400)
    }
    updateData.title = title
  }

  if (payload.test_type !== undefined || payload.type !== undefined) {
    const testType = payload.test_type || payload.type
    if (!ALLOWED_TEST_TYPES.includes(testType)) {
      throw createServiceError("test_type must be topic_wise or full_length", 400)
    }
    updateData.type = testType
  }

  if (payload.duration_minutes !== undefined) {
    updateData.durationMinutes = parsePositiveInt(payload.duration_minutes, "duration_minutes")
  }

  if (payload.total_marks !== undefined) {
    updateData.totalMarks = parsePositiveInt(payload.total_marks, "total_marks")
  }

  if (payload.is_active !== undefined) {
    updateData.isActive = Boolean(payload.is_active)
  }

  if (Object.keys(updateData).length === 0) {
    throw createServiceError("no updatable fields provided", 400)
  }

  const updatedTest = await prisma.test.update({
    where: {
      id: testId,
    },
    data: updateData,
    select: {
      id: true,
      coachingId: true,
      testSeriesId: true,
      title: true,
      type: true,
      totalQuestions: true,
      totalMarks: true,
      durationMinutes: true,
      isActive: true,
      scheduledStart: true,
      scheduledEnd: true,
      updatedAt: true,
    },
  })

  return {
    id: updatedTest.id,
    coaching_id: updatedTest.coachingId,
    test_series_id: updatedTest.testSeriesId,
    title: updatedTest.title,
    type: updatedTest.type,
    total_questions: updatedTest.totalQuestions,
    total_marks: updatedTest.totalMarks,
    duration_minutes: updatedTest.durationMinutes,
    is_active: updatedTest.isActive,
    scheduled_start: updatedTest.scheduledStart,
    scheduled_end: updatedTest.scheduledEnd,
    updated_at: updatedTest.updatedAt,
  }
}

const deleteTest = async (testId, user) => {
  const coachingId = await resolveCoachingId(user)
  await getOwnedTest(testId, coachingId)

  const attemptCount = await prisma.examAttempt.count({
    where: {
      testId,
    },
  })

  if (attemptCount > 0) {
    throw createServiceError("cannot delete test with existing attempts", 400)
  }

  await prisma.test.delete({
    where: {
      id: testId,
    },
  })

  return {
    id: testId,
    deleted: true,
  }
}

const createTestSeries = async (payload, user) => {
  const coachingId = await resolveCoachingId(user)

  const seriesName = payload.series_name?.trim() || payload.name?.trim()
  const description = payload.description?.trim() || null
  const examType = payload.exam_type?.trim() || "General"
  const subjectsCovered = Array.isArray(payload.subjects_covered)
    ? payload.subjects_covered.filter((item) => Boolean(item)).map((item) => String(item).trim())
    : []
  const visibility = payload.visibility || (payload.is_public ? "public" : "private")
  const price = parsePrice(payload.price)
  const selectedTestIds = await resolveOwnedTests(coachingId, payload.selected_test_ids || [])

  if (!seriesName) {
    throw createServiceError("series_name is required", 400)
  }

  if (!ALLOWED_VISIBILITY_VALUES.includes(visibility)) {
    throw createServiceError("visibility must be public or private", 400)
  }

  const series = await prisma.$transaction(async (tx) => {
    const created = await tx.testSeries.create({
      data: {
        coachingId,
        name: seriesName,
        description,
        examType,
        subjectsCovered,
        price,
        isPublic: visibility === "public",
        totalTests: selectedTestIds.length,
      },
      select: {
        id: true,
      },
    })

    if (selectedTestIds.length) {
      await tx.test.updateMany({
        where: {
          id: {
            in: selectedTestIds,
          },
          coachingId,
        },
        data: {
          testSeriesId: created.id,
        },
      })
    }

    return tx.testSeries.findUnique({
      where: {
        id: created.id,
      },
      include: {
        tests: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            title: true,
            type: true,
            totalQuestions: true,
            durationMinutes: true,
          },
        },
      },
    })
  })

  return mapSeries(series)
}

const getTestSeries = async (user) => {
  const coachingId = await resolveCoachingId(user)

  const series = await prisma.testSeries.findMany({
    where: {
      coachingId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      tests: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          type: true,
          totalQuestions: true,
          durationMinutes: true,
        },
      },
    },
  })

  return series.map(mapSeries)
}

const getTestSeriesById = async (seriesId, user) => {
  const coachingId = await resolveCoachingId(user)

  const series = await prisma.testSeries.findUnique({
    where: {
      id: seriesId,
    },
    include: {
      tests: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          type: true,
          totalQuestions: true,
          durationMinutes: true,
        },
      },
    },
  })

  if (!series) {
    throw createServiceError("test series not found", 404)
  }

  if (series.coachingId !== coachingId) {
    throw createServiceError("forbidden", 403)
  }

  return mapSeries(series)
}

const updateTestSeries = async (seriesId, payload, user) => {
  const coachingId = await resolveCoachingId(user)

  const existingSeries = await prisma.testSeries.findUnique({
    where: {
      id: seriesId,
    },
    select: {
      id: true,
      coachingId: true,
    },
  })

  if (!existingSeries) {
    throw createServiceError("test series not found", 404)
  }

  if (existingSeries.coachingId !== coachingId) {
    throw createServiceError("forbidden", 403)
  }

  const updateData = {}

  if (payload.series_name !== undefined || payload.name !== undefined) {
    const name = (payload.series_name || payload.name || "").trim()
    if (!name) {
      throw createServiceError("series_name cannot be empty", 400)
    }
    updateData.name = name
  }

  if (payload.description !== undefined) {
    updateData.description = payload.description?.trim() || null
  }

  if (payload.exam_type !== undefined) {
    const examType = payload.exam_type?.trim()
    if (!examType) {
      throw createServiceError("exam_type cannot be empty", 400)
    }
    updateData.examType = examType
  }

  if (payload.subjects_covered !== undefined) {
    if (!Array.isArray(payload.subjects_covered)) {
      throw createServiceError("subjects_covered must be an array", 400)
    }
    updateData.subjectsCovered = payload.subjects_covered
      .filter((item) => Boolean(item))
      .map((item) => String(item).trim())
  }

  if (payload.price !== undefined) {
    updateData.price = parsePrice(payload.price)
  }

  if (payload.visibility !== undefined || payload.is_public !== undefined) {
    const visibility = payload.visibility || (payload.is_public ? "public" : "private")
    if (!ALLOWED_VISIBILITY_VALUES.includes(visibility)) {
      throw createServiceError("visibility must be public or private", 400)
    }
    updateData.isPublic = visibility === "public"
  }

  const hasSelectedTestsUpdate = payload.selected_test_ids !== undefined
  const selectedTestIds = hasSelectedTestsUpdate
    ? await resolveOwnedTests(coachingId, payload.selected_test_ids)
    : null

  const series = await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length) {
      await tx.testSeries.update({
        where: {
          id: seriesId,
        },
        data: updateData,
      })
    }

    if (hasSelectedTestsUpdate) {
      await tx.test.updateMany({
        where: {
          coachingId,
          testSeriesId: seriesId,
        },
        data: {
          testSeriesId: null,
        },
      })

      if (selectedTestIds.length) {
        await tx.test.updateMany({
          where: {
            coachingId,
            id: {
              in: selectedTestIds,
            },
          },
          data: {
            testSeriesId: seriesId,
          },
        })
      }

      await tx.testSeries.update({
        where: {
          id: seriesId,
        },
        data: {
          totalTests: selectedTestIds.length,
        },
      })
    }

    return tx.testSeries.findUnique({
      where: {
        id: seriesId,
      },
      include: {
        tests: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            title: true,
            type: true,
            totalQuestions: true,
            durationMinutes: true,
          },
        },
      },
    })
  })

  return mapSeries(series)
}

const deleteTestSeries = async (seriesId, user) => {
  const coachingId = await resolveCoachingId(user)

  const series = await prisma.testSeries.findUnique({
    where: {
      id: seriesId,
    },
    select: {
      id: true,
      coachingId: true,
    },
  })

  if (!series) {
    throw createServiceError("test series not found", 404)
  }

  if (series.coachingId !== coachingId) {
    throw createServiceError("forbidden", 403)
  }

  await prisma.$transaction(async (tx) => {
    await tx.test.updateMany({
      where: {
        coachingId,
        testSeriesId: seriesId,
      },
      data: {
        testSeriesId: null,
      },
    })

    await tx.testSeries.delete({
      where: {
        id: seriesId,
      },
    })
  })

  return {
    id: seriesId,
    deleted: true,
  }
}

const createSection = async (testId, payload, user) => {
  const coachingId = await resolveCoachingId(user)
  await getOwnedTest(testId, coachingId)

  const sectionTitle = payload.title?.trim()
  const orderIndex = parsePositiveInt(payload.order_index, "order_index")

  if (!sectionTitle) {
    throw createServiceError("title is required", 400)
  }

  const existingOrderSection = await prisma.testSection.findFirst({
    where: {
      testId,
      orderIndex,
    },
    select: {
      id: true,
    },
  })

  if (existingOrderSection) {
    throw createServiceError("section with this order_index already exists", 409)
  }

  const section = await prisma.testSection.create({
    data: {
      testId,
      sectionName: sectionTitle,
      orderIndex,
      questionCount: 0,
      durationMinutes: 0,
    },
    select: {
      id: true,
      testId: true,
      sectionName: true,
      orderIndex: true,
      questionCount: true,
      createdAt: true,
    },
  })

  return {
    id: section.id,
    test_id: section.testId,
    title: section.sectionName,
    order_index: section.orderIndex,
    question_count: section.questionCount,
    created_at: section.createdAt,
  }
}

const getSections = async (testId, user) => {
  const coachingId = await resolveCoachingId(user)
  await getOwnedTest(testId, coachingId)

  const sections = await prisma.testSection.findMany({
    where: {
      testId,
    },
    orderBy: {
      orderIndex: "asc",
    },
    select: {
      id: true,
      testId: true,
      sectionName: true,
      orderIndex: true,
      questionCount: true,
      durationMinutes: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return sections.map((section) => ({
    id: section.id,
    test_id: section.testId,
    title: section.sectionName,
    order_index: section.orderIndex,
    question_count: section.questionCount,
    duration_minutes: section.durationMinutes,
    created_at: section.createdAt,
    updated_at: section.updatedAt,
  }))
}

const addQuestionToSection = async (sectionId, payload, user) => {
  const coachingId = await resolveCoachingId(user)
  const section = await getOwnedSection(sectionId, coachingId)

  const questionId = payload.question_id

  if (!questionId) {
    throw createServiceError("question_id is required", 400)
  }

  const question = await prisma.question.findUnique({
    where: {
      id: questionId,
    },
    select: {
      id: true,
      coachingId: true,
    },
  })

  if (!question) {
    throw createServiceError("question not found", 404)
  }

  if (question.coachingId !== coachingId) {
    throw createServiceError("forbidden", 403)
  }

  const existingMapping = await prisma.testQuestion.findFirst({
    where: {
      testId: section.testId,
      questionId,
    },
    select: {
      id: true,
      sectionId: true,
    },
  })

  if (existingMapping) {
    if (existingMapping.sectionId === sectionId) {
      throw createServiceError("question already exists in this section", 409)
    }

    throw createServiceError("question already mapped to this test", 409)
  }

  const orderState = await prisma.testQuestion.aggregate({
    where: {
      testId: section.testId,
      sectionId,
    },
    _max: {
      orderIndex: true,
    },
  })

  const nextOrderIndex = (orderState._max.orderIndex || 0) + 1

  const result = await prisma.$transaction(async (tx) => {
    const mapping = await tx.testQuestion.create({
      data: {
        testId: section.testId,
        sectionId,
        questionId,
        orderIndex: nextOrderIndex,
      },
      select: {
        id: true,
        testId: true,
        sectionId: true,
        questionId: true,
        orderIndex: true,
        createdAt: true,
      },
    })

    await tx.testSection.update({
      where: {
        id: sectionId,
      },
      data: {
        questionCount: {
          increment: 1,
        },
      },
    })

    await tx.test.update({
      where: {
        id: section.testId,
      },
      data: {
        totalQuestions: {
          increment: 1,
        },
      },
    })

    return mapping
  })

  return {
    id: result.id,
    test_id: result.testId,
    section_id: result.sectionId,
    question_id: result.questionId,
    order_index: result.orderIndex,
    created_at: result.createdAt,
  }
}

const removeQuestionFromSection = async (sectionId, questionId, user) => {
  const coachingId = await resolveCoachingId(user)
  const section = await getOwnedSection(sectionId, coachingId)

  const mapping = await prisma.testQuestion.findFirst({
    where: {
      testId: section.testId,
      sectionId,
      questionId,
    },
    select: {
      id: true,
    },
  })

  if (!mapping) {
    throw createServiceError("question mapping not found in section", 404)
  }

  await prisma.$transaction(async (tx) => {
    await tx.testQuestion.delete({
      where: {
        id: mapping.id,
      },
    })

    await tx.testSection.update({
      where: {
        id: sectionId,
      },
      data: {
        questionCount: Math.max(section.questionCount - 1, 0),
      },
    })

    await tx.test.update({
      where: {
        id: section.testId,
      },
      data: {
        totalQuestions: Math.max(section.test.totalQuestions - 1, 0),
      },
    })
  })

  return {
    section_id: sectionId,
    question_id: questionId,
    removed: true,
  }
}

module.exports = {
  createTest,
  getTests,
  getTestLeaderboard,
  updateTest,
  deleteTest,
  updateTestSchedule,
  createTestSeries,
  getTestSeries,
  getTestSeriesById,
  updateTestSeries,
  deleteTestSeries,
  createSection,
  getSections,
  addQuestionToSection,
  removeQuestionFromSection,
}