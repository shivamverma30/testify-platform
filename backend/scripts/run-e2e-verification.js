/* eslint-disable no-console */
const fs = require("fs")
const path = require("path")
const bcrypt = require("bcrypt")
const xlsx = require("xlsx")
const prisma = require("../db")

const BASE_URL = process.env.BACKEND_URL || "http://localhost:5000"
const RUN_ID = `e2e_${Date.now()}`

const SUPER_ADMIN_EMAIL = "shivam3006.nitb@gmail.com"
const SUPER_ADMIN_PASSWORD_CANDIDATES = [
  'Hh>vT5FZ$1DW0^YS"hY"Xj?Â£',
  'Hh>vT5FZ$1DW0^YS"hY"Xj?£',
]

const state = {
  runId: RUN_ID,
  baseUrl: BASE_URL,
  users: {},
  coachings: {},
  students: {},
  questions: {},
  tests: {},
  sections: {},
  series: {},
  tokens: {},
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const parseBody = async (res) => {
  const text = await res.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const request = async ({ method, endpoint, token, body, formData, expectedStatus }) => {
  const headers = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const init = {
    method,
    headers,
  }

  if (formData) {
    init.body = formData
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json"
    init.body = JSON.stringify(body)
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, init)
  const payload = await parseBody(res)

  if (expectedStatus !== undefined && res.status !== expectedStatus) {
    throw new Error(
      `Expected ${expectedStatus} for ${method} ${endpoint}, got ${res.status}: ${JSON.stringify(payload)}`,
    )
  }

  return {
    status: res.status,
    ok: res.ok,
    payload,
  }
}

const extractData = (payload) => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data
  }

  return payload
}

const login = async (email, password, role, expectedStatus = 200) => {
  const response = await request({
    method: "POST",
    endpoint: "/api/auth/login",
    body: { email, password, role },
    expectedStatus,
  })

  if (expectedStatus !== 200) {
    return response
  }

  const data = extractData(response.payload)
  assert(data?.token, `No token returned for ${email}/${role}`)
  return data.token
}

const ensureSuperAdminToken = async () => {
  for (const password of SUPER_ADMIN_PASSWORD_CANDIDATES) {
    const result = await login(SUPER_ADMIN_EMAIL, password, "super_admin", 200).catch(() => null)
    if (result) {
      state.tokens.superAdmin = result
      return
    }
  }

  const fallbackEmail = `${RUN_ID}_superadmin@testify.local`
  const fallbackPassword = "SuperAdmin@12345"
  const passwordHash = await bcrypt.hash(fallbackPassword, 10)

  await prisma.user.create({
    data: {
      email: fallbackEmail,
      passwordHash,
      role: "super_admin",
    },
  })

  const token = await login(fallbackEmail, fallbackPassword, "super_admin")
  state.tokens.superAdmin = token
  state.users.superAdminEmail = fallbackEmail
}

const createCoachingAdmin = async (label) => {
  const email = `${RUN_ID}_${label}_admin@testify.local`
  const password = "CoachAdmin@123"
  const payload = {
    institute_name: `${label.toUpperCase()} Institute ${RUN_ID}`,
    admin_name: `${label.toUpperCase()} Admin`,
    email,
    phone: `9000000${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
    password,
  }

  const result = await request({
    method: "POST",
    endpoint: "/api/auth/register-coaching",
    body: payload,
    expectedStatus: 201,
  })

  const data = extractData(result.payload)
  state.coachings[label] = {
    id: data.id,
    email,
    password,
    instituteName: payload.institute_name,
  }
}

const approveCoaching = async (coachingId) => {
  await request({
    method: "PATCH",
    endpoint: `/api/super-admin/coaching/${coachingId}/approve`,
    token: state.tokens.superAdmin,
    expectedStatus: 200,
  })
}

const registerStudent = async (label, coachingId) => {
  const email = `${RUN_ID}_${label}_student@testify.local`
  const password = "Student@123"

  const result = await request({
    method: "POST",
    endpoint: "/api/auth/register-student",
    body: {
      name: `${label.toUpperCase()} Student`,
      email,
      phone: `8000000${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
      selected_coaching_id: coachingId,
      exam_preparing_for: "JEE",
      password,
    },
    expectedStatus: 201,
  })

  const data = extractData(result.payload)
  state.students[label] = {
    id: data.id,
    email,
    password,
    coachingId,
  }
}

const writeBulkFiles = () => {
  const dirPath = path.join(__dirname, "tmp")
  fs.mkdirSync(dirPath, { recursive: true })

  const csvPath = path.join(dirPath, `${RUN_ID}_questions.csv`)
  const xlsxPath = path.join(dirPath, `${RUN_ID}_questions.xlsx`)

  const csvContent = [
    "subject,topic,question_text,option_a,option_b,option_c,option_d,correct_option,marks,negative_marks,difficulty",
    "Math,Geometry,Area of square with side 2?,2,4,6,8,B,4,1,easy",
  ].join("\n")
  fs.writeFileSync(csvPath, csvContent, "utf8")

  const sheetData = [
    {
      subject: "Physics",
      topic: "Kinematics",
      question_text: "Unit of acceleration?",
      option_a: "m/s",
      option_b: "m/s2",
      option_c: "kg",
      option_d: "N",
      correct_option: "B",
      marks: 4,
      negative_marks: 1,
      difficulty: "easy",
    },
  ]

  const workbook = xlsx.utils.book_new()
  const sheet = xlsx.utils.json_to_sheet(sheetData)
  xlsx.utils.book_append_sheet(workbook, sheet, "Questions")
  xlsx.writeFile(workbook, xlsxPath)

  return { csvPath, xlsxPath }
}

const uploadFile = async (token, filePath, contentType) => {
  const bytes = fs.readFileSync(filePath)
  const form = new FormData()
  form.append("file", new Blob([bytes], { type: contentType }), path.basename(filePath))

  const result = await request({
    method: "POST",
    endpoint: "/api/questions/bulk-upload",
    token,
    formData: form,
    expectedStatus: 200,
  })

  const data = extractData(result.payload)
  assert(data?.uploaded >= 1, `Expected bulk upload to upload at least 1 row for ${filePath}`)
}

const verifyDatabaseWrites = async () => {
  const [studentA, studentB, questionA, testA, sectionCount, mappingCount, seriesA] = await Promise.all([
    prisma.student.findUnique({ where: { id: state.students.a.id }, select: { id: true, coachingId: true } }),
    prisma.student.findUnique({ where: { id: state.students.b.id }, select: { id: true, coachingId: true } }),
    prisma.question.findUnique({ where: { id: state.questions.main.id }, select: { id: true, coachingId: true } }),
    prisma.test.findUnique({ where: { id: state.tests.main.id }, select: { id: true, coachingId: true } }),
    prisma.testSection.count({ where: { testId: state.tests.main.id } }),
    prisma.testQuestion.count({ where: { testId: state.tests.main.id } }),
    prisma.testSeries.findUnique({ where: { id: state.series.main.id }, select: { id: true, totalTests: true } }),
  ])

  assert(studentA, "DB validation failed: student A not found")
  assert(studentB, "DB validation failed: student B not found")
  assert(questionA, "DB validation failed: main question not found")
  assert(testA, "DB validation failed: main test not found")
  assert(sectionCount >= 2, "DB validation failed: expected at least 2 test sections")
  assert(mappingCount >= 2, "DB validation failed: expected at least 2 test question mappings")
  assert(seriesA && Number(seriesA.totalTests) >= 2, "DB validation failed: series totalTests should be >= 2")
}

const run = async () => {
  console.log(`Running backend E2E verification with run id: ${RUN_ID}`)

  await request({ method: "GET", endpoint: "/health", expectedStatus: 200 })

  await ensureSuperAdminToken()

  await createCoachingAdmin("a")
  await createCoachingAdmin("b")

  await approveCoaching(state.coachings.a.id)
  await approveCoaching(state.coachings.b.id)

  state.tokens.adminA = await login(
    state.coachings.a.email,
    state.coachings.a.password,
    "coaching_admin",
  )
  state.tokens.adminB = await login(
    state.coachings.b.email,
    state.coachings.b.password,
    "coaching_admin",
  )

  await registerStudent("a", state.coachings.a.id)
  await registerStudent("b", state.coachings.b.id)

  await request({
    method: "PATCH",
    endpoint: `/api/admin/students/${state.students.a.id}/approve`,
    token: state.tokens.adminA,
    expectedStatus: 200,
  })

  const profileResponse = await request({
    method: "GET",
    endpoint: `/api/admin/students/${state.students.a.id}/profile`,
    token: state.tokens.adminA,
    expectedStatus: 200,
  })
  assert(extractData(profileResponse.payload)?.id === state.students.a.id, "Student profile mismatch")

  state.tokens.studentA = await login(state.students.a.email, state.students.a.password, "student")

  const questionCreate = await request({
    method: "POST",
    endpoint: "/api/questions",
    token: state.tokens.adminA,
    expectedStatus: 201,
    body: {
      subject: "Math",
      topic: "Algebra",
      question_text: "2 + 3 = ?",
      option_a: "4",
      option_b: "5",
      option_c: "6",
      option_d: "7",
      correct_option: "B",
      marks: 4,
      negative_marks: 1,
      difficulty: "easy",
    },
  })
  state.questions.main = { id: extractData(questionCreate.payload).id }

  await request({
    method: "PUT",
    endpoint: `/api/questions/${state.questions.main.id}`,
    token: state.tokens.adminA,
    expectedStatus: 200,
    body: {
      topic: "Arithmetic",
      marks: 4,
    },
  })

  const { csvPath, xlsxPath } = writeBulkFiles()
  await uploadFile(state.tokens.adminA, csvPath, "text/csv")
  await uploadFile(
    state.tokens.adminA,
    xlsxPath,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  )

  const allQuestionsResponse = await request({
    method: "GET",
    endpoint: "/api/questions",
    token: state.tokens.adminA,
    expectedStatus: 200,
  })
  const allQuestions = extractData(allQuestionsResponse.payload)
  assert(Array.isArray(allQuestions) && allQuestions.length >= 3, "Expected at least 3 questions")

  const testCreate = await request({
    method: "POST",
    endpoint: "/api/tests",
    token: state.tokens.adminA,
    expectedStatus: 201,
    body: {
      title: `${RUN_ID} Main Test`,
      test_type: "full_length",
      duration_minutes: 90,
      total_marks: 100,
    },
  })
  state.tests.main = { id: extractData(testCreate.payload).id }

  const sectionOne = await request({
    method: "POST",
    endpoint: `/api/tests/${state.tests.main.id}/sections`,
    token: state.tokens.adminA,
    expectedStatus: 201,
    body: {
      title: "Section 1",
      order_index: 1,
    },
  })
  const sectionTwo = await request({
    method: "POST",
    endpoint: `/api/tests/${state.tests.main.id}/sections`,
    token: state.tokens.adminA,
    expectedStatus: 201,
    body: {
      title: "Section 2",
      order_index: 2,
    },
  })

  state.sections.one = { id: extractData(sectionOne.payload).id }
  state.sections.two = { id: extractData(sectionTwo.payload).id }

  await request({
    method: "POST",
    endpoint: `/api/sections/${state.sections.one.id}/questions`,
    token: state.tokens.adminA,
    expectedStatus: 201,
    body: {
      question_id: allQuestions[0].id,
    },
  })

  await request({
    method: "POST",
    endpoint: `/api/sections/${state.sections.two.id}/questions`,
    token: state.tokens.adminA,
    expectedStatus: 201,
    body: {
      question_id: allQuestions[1].id,
    },
  })

  const now = Date.now()
  const start = new Date(now + 2 * 60 * 60 * 1000).toISOString()
  const end = new Date(now + 3 * 60 * 60 * 1000).toISOString()

  await request({
    method: "PATCH",
    endpoint: `/api/tests/${state.tests.main.id}/schedule`,
    token: state.tokens.adminA,
    expectedStatus: 200,
    body: {
      scheduled_start: start,
      scheduled_end: end,
    },
  })

  const secondTestCreate = await request({
    method: "POST",
    endpoint: "/api/tests",
    token: state.tokens.adminA,
    expectedStatus: 201,
    body: {
      title: `${RUN_ID} Second Test`,
      test_type: "topic_wise",
      duration_minutes: 60,
      total_marks: 50,
    },
  })
  state.tests.second = { id: extractData(secondTestCreate.payload).id }

  const seriesCreate = await request({
    method: "POST",
    endpoint: "/api/tests/series",
    token: state.tokens.adminA,
    expectedStatus: 201,
    body: {
      series_name: `${RUN_ID} Series`,
      description: "E2E verification series",
      exam_type: "JEE",
      subjects_covered: ["Math", "Physics"],
      price: 99,
      visibility: "public",
      selected_test_ids: [state.tests.main.id],
    },
  })
  state.series.main = { id: extractData(seriesCreate.payload).id }

  const seriesUpdate = await request({
    method: "PATCH",
    endpoint: `/api/tests/series/${state.series.main.id}`,
    token: state.tokens.adminA,
    expectedStatus: 200,
    body: {
      selected_test_ids: [state.tests.main.id, state.tests.second.id],
    },
  })
  assert(
    (extractData(seriesUpdate.payload)?.tests || []).length >= 2,
    "Series update did not attach expected tests",
  )

  await request({
    method: "GET",
    endpoint: "/api/admin/analytics",
    token: state.tokens.adminA,
    expectedStatus: 200,
  })

  await request({
    method: "GET",
    endpoint: "/api/admin/students",
    token: state.tokens.studentA,
    expectedStatus: 403,
  })

  await request({
    method: "GET",
    endpoint: `/api/admin/students/${state.students.b.id}/profile`,
    token: state.tokens.adminA,
    expectedStatus: 403,
  })

  const questionBCreate = await request({
    method: "POST",
    endpoint: "/api/questions",
    token: state.tokens.adminB,
    expectedStatus: 201,
    body: {
      subject: "Chemistry",
      topic: "Atoms",
      question_text: "Atomic number of Hydrogen?",
      option_a: "1",
      option_b: "2",
      option_c: "3",
      option_d: "4",
      correct_option: "A",
      marks: 4,
      negative_marks: 1,
      difficulty: "easy",
    },
  })
  state.questions.other = { id: extractData(questionBCreate.payload).id }

  await request({
    method: "PUT",
    endpoint: `/api/questions/${state.questions.other.id}`,
    token: state.tokens.adminA,
    expectedStatus: 403,
    body: {
      topic: "UnauthorizedEdit",
      marks: 4,
    },
  })

  const testBCreate = await request({
    method: "POST",
    endpoint: "/api/tests",
    token: state.tokens.adminB,
    expectedStatus: 201,
    body: {
      title: `${RUN_ID} Other Coaching Test`,
      test_type: "full_length",
      duration_minutes: 45,
      total_marks: 40,
    },
  })
  state.tests.other = { id: extractData(testBCreate.payload).id }

  await request({
    method: "PATCH",
    endpoint: `/api/tests/${state.tests.other.id}`,
    token: state.tokens.adminA,
    expectedStatus: 403,
    body: {
      title: "Unauthorized",
    },
  })

  await verifyDatabaseWrites()

  const resultPath = path.join(__dirname, "tmp", `${RUN_ID}_result.json`)
  fs.mkdirSync(path.dirname(resultPath), { recursive: true })
  fs.writeFileSync(resultPath, JSON.stringify(state, null, 2), "utf8")

  console.log("Backend E2E verification passed")
  console.log(`Result file: ${resultPath}`)
  console.log(`adminAToken=${state.tokens.adminA}`)
  console.log(`studentAToken=${state.tokens.studentA}`)
}

run()
  .catch((error) => {
    console.error("Backend E2E verification failed")
    console.error(error.stack || error.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
