const prisma = require("../../db")
const { sendTestScheduledEmail } = require("./email.service")

const ALLOWED_TEST_TYPES = ["topic_wise", "full_length"]
const ALLOWED_VISIBILITY_VALUES = ["public", "private"]
const ALLOWED_OPTIONS = ["A", "B", "C", "D"]
const ALLOWED_DIFFICULTIES = ["easy", "medium", "hard"]
const AI_SERVICE_BASE_URL = process.env.AI_SERVICE_BASE_URL || "http://localhost:8000"

const NIMCET_SECTION_BLUEPRINT = [
  {
    key: "mathematics",
    section_name: "Mathematics",
    subject: "Mathematics",
    topic: "Mathematics",
    question_count: 50,
    duration_minutes: 70,
    marks: 12,
    negative_marks: 3,
  },
  {
    key: "reasoning",
    section_name: "Analytical Ability & Logical Reasoning",
    subject: "Analytical Ability & Logical Reasoning",
    topic: "Analytical Ability & Logical Reasoning",
    question_count: 40,
    duration_minutes: 30,
    marks: 6,
    negative_marks: 1.5,
  },
  {
    key: "computer",
    section_name: "Computer Awareness",
    subject: "Computer Awareness",
    topic: "Computer Awareness",
    question_count: 20,
    duration_minutes: 10,
    marks: 6,
    negative_marks: 1.5,
  },
  {
    key: "english",
    section_name: "General English",
    subject: "General English",
    topic: "General English",
    question_count: 10,
    duration_minutes: 10,
    marks: 4,
    negative_marks: 1,
  },
]

const NIMCET_TOTAL_MARKS = 1000
const NIMCET_TOTAL_DURATION_MINUTES = 120

const NIMCET_SECTION_TIME_ALLOCATIONS = [
  {
    section: "Mathematics",
    duration_minutes: 70,
  },
  {
    section: "Analytical Ability & Logical Reasoning",
    duration_minutes: 30,
  },
  {
    section: "Computer + General English",
    duration_minutes: 20,
  },
]

const NIMCET_MARKING_SCHEME = [
  {
    section: "Mathematics",
    marks: 12,
    negative_marks: 3,
  },
  {
    section: "Analytical Ability & Logical Reasoning",
    marks: 6,
    negative_marks: 1.5,
  },
  {
    section: "Computer Awareness",
    marks: 6,
    negative_marks: 1.5,
  },
  {
    section: "General English",
    marks: 4,
    negative_marks: 1,
  },
]

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

const parseNonNegativeInt = (value, fieldName, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createServiceError(`${fieldName} must be a non-negative integer`, 400)
  }

  return parsed
}

const parseNonNegativeNumber = (value, fieldName, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createServiceError(`${fieldName} must be a non-negative number`, 400)
  }

  return Number(parsed.toFixed(2))
}

const normalizeText = (value) => {
  if (value === undefined || value === null) {
    return ""
  }

  return String(value).trim()
}

const normalizeDifficulty = (value, fallback = "medium") => {
  if (value === undefined || value === null || value === "") {
    return fallback
  }

  const normalized = String(value).trim().toLowerCase()

  if (!ALLOWED_DIFFICULTIES.includes(normalized)) {
    throw createServiceError("difficulty must be one of easy, medium, hard", 400)
  }

  return normalized
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

const parseAiResponseBody = (bodyText) => {
  if (!bodyText) {
    return null
  }

  try {
    return JSON.parse(bodyText)
  } catch {
    return null
  }
}

const callAiService = async (endpoint, payload = {}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000)

  try {
    const response = await fetch(`${AI_SERVICE_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const bodyText = await response.text()
    const parsedBody = parseAiResponseBody(bodyText)

    if (!response.ok) {
      throw createServiceError(
        parsedBody?.message || parsedBody?.detail || `AI service request failed with status ${response.status}`,
        502,
      )
    }

    return parsedBody
  } catch (error) {
    if (error.name === "AbortError") {
      throw createServiceError("AI service request timed out", 504)
    }

    if (error.statusCode) {
      throw error
    }

    throw createServiceError("failed to connect to AI service", 502)
  } finally {
    clearTimeout(timeout)
  }
}

const extractTopicQuestionList = (payload) => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.questions)) {
    return payload.questions
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.result)) {
    return payload.result
  }

  return []
}

const extractSectionQuestionList = (section) => {
  if (Array.isArray(section)) {
    return section
  }

  if (Array.isArray(section?.questions)) {
    return section.questions
  }

  if (Array.isArray(section?.items)) {
    return section.items
  }

  if (Array.isArray(section?.data)) {
    return section.data
  }

  return []
}

const extractFullSectionList = (payload) => {
  const candidate = payload?.sections || payload?.data?.sections || payload?.data || payload

  if (Array.isArray(candidate)) {
    return candidate
  }

  if (candidate && typeof candidate === "object") {
    return Object.entries(candidate).map(([sectionName, value]) => {
      if (Array.isArray(value)) {
        return {
          section_name: sectionName,
          questions: value,
        }
      }

      if (value && typeof value === "object") {
        return {
          section_name: value.section_name || value.title || value.name || sectionName,
          ...value,
        }
      }

      return {
        section_name: sectionName,
        questions: [],
      }
    })
  }

  return []
}

const normalizeSectionKey = (value) => {
  const normalized = normalizeText(value).toLowerCase()

  if (!normalized) {
    return ""
  }

  if (normalized.includes("math")) {
    return "mathematics"
  }

  if (
    normalized.includes("reason") ||
    normalized.includes("logical") ||
    normalized.includes("analytical") ||
    normalized.includes("ability")
  ) {
    return "reasoning"
  }

  if (normalized.includes("computer")) {
    return "computer"
  }

  if (normalized.includes("english")) {
    return "english"
  }

  return ""
}

const extractOptionsFromQuestion = (rawQuestion) => {
  if (Array.isArray(rawQuestion?.options)) {
    const options = rawQuestion.options.map((item) => normalizeText(item)).filter(Boolean)

    if (options.length >= 4) {
      return {
        A: options[0],
        B: options[1],
        C: options[2],
        D: options[3],
      }
    }
  }

  if (rawQuestion?.options && typeof rawQuestion.options === "object") {
    const options = rawQuestion.options
    const optionA = normalizeText(options.A ?? options.a)
    const optionB = normalizeText(options.B ?? options.b)
    const optionC = normalizeText(options.C ?? options.c)
    const optionD = normalizeText(options.D ?? options.d)

    if (optionA && optionB && optionC && optionD) {
      return {
        A: optionA,
        B: optionB,
        C: optionC,
        D: optionD,
      }
    }
  }

  const optionA = normalizeText(rawQuestion.option_a || rawQuestion.optionA || rawQuestion.A || rawQuestion.a)
  const optionB = normalizeText(rawQuestion.option_b || rawQuestion.optionB || rawQuestion.B || rawQuestion.b)
  const optionC = normalizeText(rawQuestion.option_c || rawQuestion.optionC || rawQuestion.C || rawQuestion.c)
  const optionD = normalizeText(rawQuestion.option_d || rawQuestion.optionD || rawQuestion.D || rawQuestion.d)

  if (!optionA || !optionB || !optionC || !optionD) {
    throw createServiceError("generated question must include four options", 502)
  }

  return {
    A: optionA,
    B: optionB,
    C: optionC,
    D: optionD,
  }
}

const resolveCorrectOption = (rawCorrectAnswer, options) => {
  const normalized = normalizeText(rawCorrectAnswer)

  if (!normalized) {
    throw createServiceError("generated question must include a correct answer", 502)
  }

  const normalizedUpper = normalized.toUpperCase()

  if (ALLOWED_OPTIONS.includes(normalizedUpper)) {
    return normalizedUpper
  }

  const matchedOption = ALLOWED_OPTIONS.find(
    (option) => options[option].trim().toLowerCase() === normalized.toLowerCase(),
  )

  if (!matchedOption) {
    throw createServiceError("correct answer does not match provided options", 502)
  }

  return matchedOption
}

const normalizeGeneratedQuestion = (rawQuestion, defaults = {}) => {
  const questionText = normalizeText(
    rawQuestion.question || rawQuestion.question_text || rawQuestion.questionText || rawQuestion.prompt,
  )

  if (!questionText) {
    throw createServiceError("generated question text is missing", 502)
  }

  const options = extractOptionsFromQuestion(rawQuestion)
  const correctOption = resolveCorrectOption(
    rawQuestion.correct_option ||
      rawQuestion.correctOption ||
      rawQuestion.correct_answer ||
      rawQuestion.correctAnswer ||
      rawQuestion.answer,
    options,
  )

  const marks = parsePositiveInt(rawQuestion.marks ?? defaults.marks, "marks")
  const negativeMarks = parseNonNegativeNumber(
    rawQuestion.negative_marks ?? rawQuestion.negativeMarks ?? defaults.negative_marks,
    "negative_marks",
    0,
  )
  const difficulty = normalizeDifficulty(rawQuestion.difficulty ?? defaults.difficulty, "medium")
  const subject = normalizeText(rawQuestion.subject || defaults.subject) || "General"
  const topic = normalizeText(rawQuestion.topic || defaults.topic) || "General"

  return {
    subject,
    topic,
    question_text: questionText,
    option_a: options.A,
    option_b: options.B,
    option_c: options.C,
    option_d: options.D,
    correct_option: correctOption,
    correct_answer: options[correctOption],
    marks,
    negative_marks: negativeMarks,
    difficulty,
  }
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
    payload.scheduled_start || payload.scheduledStart || payload.start_time || payload.startTime,
    "scheduled_start",
  )
  const scheduledEnd = parseScheduleDate(
    payload.scheduled_end || payload.scheduledEnd || payload.end_time || payload.endTime,
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
    start_time: updatedTest.scheduledStart,
    end_time: updatedTest.scheduledEnd,
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

const generateAiTopicTest = async (payload) => {
  const subject = normalizeText(payload.subject)
  const topic = normalizeText(payload.topic)
  const questionCount = parsePositiveInt(payload.question_count, "question_count")
  const marks = parsePositiveInt(payload.marks, "marks")
  const negativeMarks = parseNonNegativeNumber(payload.negative_marks, "negative_marks", 0)
  const difficulty = normalizeDifficulty(payload.difficulty, "medium")
  const durationMinutes = parsePositiveInt(payload.duration, "duration")

  if (!subject) {
    throw createServiceError("subject is required", 400)
  }

  if (!topic) {
    throw createServiceError("topic is required", 400)
  }

  const aiPayload = {
    subject,
    topic,
    question_count: questionCount,
    difficulty,
    marks,
    negative_marks: negativeMarks,
    duration: durationMinutes,
  }

  const aiResponse = await callAiService("/generate-topic-test", aiPayload)
  const rawQuestions = extractTopicQuestionList(aiResponse)

  if (!rawQuestions.length) {
    throw createServiceError("AI service returned no questions", 502)
  }

  const normalizedQuestions = rawQuestions
    .slice(0, questionCount)
    .map((question) =>
      normalizeGeneratedQuestion(question, {
        subject,
        topic,
        marks,
        negative_marks: negativeMarks,
        difficulty,
      }),
    )

  return {
    test_type: "topic_wise",
    subject,
    topic,
    requested_question_count: questionCount,
    generated_question_count: normalizedQuestions.length,
    marks_per_question: marks,
    negative_marks: negativeMarks,
    difficulty,
    duration_minutes: durationMinutes,
    questions: normalizedQuestions,
  }
}

const generateAiFullTest = async (payload) => {
  const difficulty = normalizeDifficulty(payload?.difficulty, "medium")

  const aiPayload = {
    difficulty,
  }

  const aiResponse = await callAiService("/generate-full-test", aiPayload)
  const rawSections = extractFullSectionList(aiResponse)

  const normalizedSections = NIMCET_SECTION_BLUEPRINT.map((blueprint) => {
    const matchedSection = rawSections.find((section) => {
      const keyFromName = normalizeSectionKey(
        section.section_name || section.sectionName || section.title || section.name,
      )

      if (keyFromName === blueprint.key) {
        return true
      }

      const keyFromSubject = normalizeSectionKey(section.subject)
      return keyFromSubject === blueprint.key
    })

    const rawQuestions = extractSectionQuestionList(matchedSection)

    const questions = rawQuestions
      .slice(0, blueprint.question_count)
      .map((question) =>
        normalizeGeneratedQuestion(question, {
          subject: blueprint.subject,
          topic: blueprint.topic,
          marks: blueprint.marks,
          negative_marks: blueprint.negative_marks,
          difficulty,
        }),
      )

    const strictQuestions = questions.map((question) => ({
      ...question,
      marks: blueprint.marks,
      negative_marks: blueprint.negative_marks,
    }))

    return {
      section_name: blueprint.section_name,
      subject: blueprint.subject,
      topic: blueprint.topic,
      duration_minutes: blueprint.duration_minutes,
      marks_per_question: blueprint.marks,
      negative_marks: blueprint.negative_marks,
      expected_question_count: blueprint.question_count,
      generated_question_count: strictQuestions.length,
      questions: strictQuestions,
    }
  })

  const hasMissingQuestions = normalizedSections.some(
    (section) => section.generated_question_count !== section.expected_question_count,
  )

  if (hasMissingQuestions) {
    throw createServiceError("AI service returned incomplete full length test sections", 502)
  }

  const totalQuestions = normalizedSections.reduce(
    (sum, section) => sum + section.generated_question_count,
    0,
  )

  if (totalQuestions === 0) {
    throw createServiceError("AI service returned no questions for full length test", 502)
  }

  return {
    test_type: "full_length",
    difficulty,
    marks_per_question: 0,
    negative_marks: 0,
    total_marks: NIMCET_TOTAL_MARKS,
    total_questions: totalQuestions,
    total_duration_minutes: NIMCET_TOTAL_DURATION_MINUTES,
    section_time_allocations: NIMCET_SECTION_TIME_ALLOCATIONS,
    marking_scheme: NIMCET_MARKING_SCHEME,
    sections: normalizedSections,
  }
}

const createAiGeneratedTest = async (payload, user) => {
  const coachingId = await resolveCoachingId(user)

  const title = normalizeText(payload.title)
  const testType = payload.test_type || (Array.isArray(payload.sections) && payload.sections.length > 1 ? "full_length" : "topic_wise")

  if (!title) {
    throw createServiceError("title is required", 400)
  }

  if (!ALLOWED_TEST_TYPES.includes(testType)) {
    throw createServiceError("test_type must be topic_wise or full_length", 400)
  }

  if (!Array.isArray(payload.sections) || !payload.sections.length) {
    throw createServiceError("sections must be a non-empty array", 400)
  }

  let normalizedSections = []
  let totalQuestions = 0
  let totalMarks = 0
  let resolvedDuration = 0

  if (testType === "full_length") {
    const sectionByKey = new Map()

    payload.sections.forEach((section, index) => {
      const sectionName = normalizeText(section.section_name || section.sectionName || section.title)
      const sectionKey = normalizeSectionKey(sectionName || section.subject)

      if (!sectionKey) {
        throw createServiceError(`sections[${index}] has an invalid section_name`, 400)
      }

      if (sectionByKey.has(sectionKey)) {
        throw createServiceError(`duplicate section provided for ${sectionName}`, 400)
      }

      sectionByKey.set(sectionKey, section)
    })

    normalizedSections = NIMCET_SECTION_BLUEPRINT.map((blueprint) => {
      const section = sectionByKey.get(blueprint.key)

      if (!section) {
        throw createServiceError(`missing required full length section: ${blueprint.section_name}`, 400)
      }

      if (!Array.isArray(section.questions) || !section.questions.length) {
        throw createServiceError(
          `section ${blueprint.section_name} must include approved questions`,
          400,
        )
      }

      const approvedQuestions = section.questions
        .filter((question) => question.approved === undefined || Boolean(question.approved))
        .map((question) =>
          normalizeGeneratedQuestion(question, {
            subject: blueprint.subject,
            topic: blueprint.topic,
            marks: blueprint.marks,
            negative_marks: blueprint.negative_marks,
            difficulty: payload.difficulty,
          }),
        )
        .map((question) => ({
          ...question,
          subject: blueprint.subject,
          marks: blueprint.marks,
          negative_marks: blueprint.negative_marks,
        }))

      if (approvedQuestions.length !== blueprint.question_count) {
        throw createServiceError(
          `section ${blueprint.section_name} must contain exactly ${blueprint.question_count} approved questions`,
          400,
        )
      }

      return {
        section_name: blueprint.section_name,
        duration_minutes: blueprint.duration_minutes,
        questions: approvedQuestions,
      }
    })

    totalQuestions = normalizedSections.reduce((sum, section) => sum + section.questions.length, 0)
    totalMarks = NIMCET_TOTAL_MARKS
    resolvedDuration = NIMCET_TOTAL_DURATION_MINUTES
  } else {
    normalizedSections = payload.sections
      .map((section, index) => {
        const sectionName = normalizeText(section.section_name || section.sectionName || section.title)
        const sectionDuration = parseNonNegativeInt(
          section.duration_minutes,
          `sections[${index}].duration_minutes`,
          0,
        )

        if (!sectionName) {
          throw createServiceError(`sections[${index}].section_name is required`, 400)
        }

        if (!Array.isArray(section.questions) || !section.questions.length) {
          return null
        }

        const approvedQuestions = section.questions
          .filter((question) => question.approved === undefined || Boolean(question.approved))
          .map((question) =>
            normalizeGeneratedQuestion(question, {
              subject: section.subject,
              topic: section.topic || sectionName,
              marks: payload.marks,
              negative_marks: payload.negative_marks,
              difficulty: payload.difficulty,
            }),
          )

        if (!approvedQuestions.length) {
          return null
        }

        return {
          section_name: sectionName,
          duration_minutes: sectionDuration,
          questions: approvedQuestions,
        }
      })
      .filter(Boolean)

    if (!normalizedSections.length) {
      throw createServiceError("at least one approved AI question is required", 400)
    }

    totalQuestions = normalizedSections.reduce((sum, section) => sum + section.questions.length, 0)
    totalMarks = normalizedSections.reduce(
      (sum, section) =>
        sum + section.questions.reduce((sectionMarks, question) => sectionMarks + question.marks, 0),
      0,
    )

    resolvedDuration =
      payload.duration_minutes !== undefined
        ? parsePositiveInt(payload.duration_minutes, "duration_minutes")
        : normalizedSections.reduce((sum, section) => sum + section.duration_minutes, 0)

    if (!resolvedDuration) {
      throw createServiceError("duration_minutes is required", 400)
    }
  }

  const createdTest = await prisma.$transaction(async (tx) => {
    const test = await tx.test.create({
      data: {
        coachingId,
        title,
        type: testType,
        totalQuestions,
        totalMarks,
        durationMinutes: resolvedDuration,
      },
      select: {
        id: true,
        title: true,
        type: true,
        totalQuestions: true,
        totalMarks: true,
        durationMinutes: true,
        createdAt: true,
      },
    })

    const createdSections = []

    for (const [sectionIndex, section] of normalizedSections.entries()) {
      const createdSection = await tx.testSection.create({
        data: {
          testId: test.id,
          sectionName: section.section_name,
          orderIndex: sectionIndex + 1,
          questionCount: section.questions.length,
          durationMinutes: section.duration_minutes,
        },
        select: {
          id: true,
          sectionName: true,
          orderIndex: true,
          questionCount: true,
          durationMinutes: true,
        },
      })

      for (const [questionIndex, question] of section.questions.entries()) {
        const createdQuestion = await tx.question.create({
          data: {
            coachingId,
            subject: question.subject,
            topic: question.topic,
            questionText: question.question_text,
            optionA: question.option_a,
            optionB: question.option_b,
            optionC: question.option_c,
            optionD: question.option_d,
            correctOption: question.correct_option,
            marks: question.marks,
            negativeMarks: question.negative_marks,
            difficulty: question.difficulty,
            createdBy: user.id,
          },
          select: {
            id: true,
          },
        })

        await tx.testQuestion.create({
          data: {
            testId: test.id,
            sectionId: createdSection.id,
            questionId: createdQuestion.id,
            orderIndex: questionIndex + 1,
          },
        })
      }

      createdSections.push({
        id: createdSection.id,
        title: createdSection.sectionName,
        order_index: createdSection.orderIndex,
        question_count: createdSection.questionCount,
        duration_minutes: createdSection.durationMinutes,
      })
    }

    return {
      id: test.id,
      title: test.title,
      type: test.type,
      total_questions: test.totalQuestions,
      total_marks: test.totalMarks,
      duration_minutes: test.durationMinutes,
      created_at: test.createdAt,
      sections: createdSections,
    }
  })

  if (testType === "full_length") {
    return {
      ...createdTest,
      section_time_allocations: NIMCET_SECTION_TIME_ALLOCATIONS,
      marking_scheme: NIMCET_MARKING_SCHEME,
    }
  }

  return createdTest
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
  generateAiTopicTest,
  generateAiFullTest,
  createAiGeneratedTest,
}