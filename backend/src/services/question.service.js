const prisma = require("../../db")
const fs = require("fs")
const path = require("path")
const csvParser = require("csv-parser")
const xlsx = require("xlsx")

const ALLOWED_OPTIONS = ["A", "B", "C", "D"]
const ALLOWED_DIFFICULTIES = ["easy", "medium", "hard"]
const BULK_INSERT_BATCH_SIZE = 100

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

const validateQuestionPayload = ({
  subject,
  topic,
  questionText,
  optionA,
  optionB,
  optionC,
  optionD,
  correctOption,
  marks,
  difficulty,
}) => {
  if (!subject || !topic || !questionText || !optionA || !optionB || !optionC || !optionD) {
    throw createServiceError(
      "subject, topic, question_text and all options are required",
      400,
    )
  }

  if (!ALLOWED_OPTIONS.includes(correctOption)) {
    throw createServiceError("correct_option must be one of A, B, C, D", 400)
  }

  if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
    throw createServiceError("difficulty must be one of easy, medium, hard", 400)
  }

  if (!Number.isInteger(marks) || marks <= 0) {
    throw createServiceError("marks must be a positive integer", 400)
  }
}

const addQuestion = async (payload, user) => {
  const coachingId = await resolveCoachingId(user)

  const questionInput = {
    subject: payload.subject?.trim(),
    topic: payload.topic?.trim(),
    questionText: payload.question_text?.trim(),
    questionImageUrl: payload.question_image_url || null,
    optionA: payload.option_a?.trim(),
    optionB: payload.option_b?.trim(),
    optionC: payload.option_c?.trim(),
    optionD: payload.option_d?.trim(),
    correctOption: payload.correct_option,
    marks: Number(payload.marks),
    negativeMarks:
      payload.negative_marks === undefined || payload.negative_marks === null
        ? 0
        : Number(payload.negative_marks),
    difficulty: payload.difficulty,
  }

  validateQuestionPayload(questionInput)

  if (!Number.isInteger(questionInput.negativeMarks) || questionInput.negativeMarks < 0) {
    throw createServiceError("negative_marks must be an integer greater than or equal to 0", 400)
  }

  const question = await prisma.question.create({
    data: {
      coachingId,
      subject: questionInput.subject,
      topic: questionInput.topic,
      questionText: questionInput.questionText,
      questionImageUrl: questionInput.questionImageUrl,
      optionA: questionInput.optionA,
      optionB: questionInput.optionB,
      optionC: questionInput.optionC,
      optionD: questionInput.optionD,
      correctOption: questionInput.correctOption,
      marks: questionInput.marks,
      negativeMarks: questionInput.negativeMarks,
      difficulty: questionInput.difficulty,
      createdBy: user.id,
    },
    select: {
      id: true,
      coachingId: true,
      subject: true,
      topic: true,
      questionText: true,
      questionImageUrl: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      correctOption: true,
      marks: true,
      negativeMarks: true,
      difficulty: true,
      createdBy: true,
      createdAt: true,
    },
  })

  return question
}

const getQuestions = async (filters, user) => {
  const coachingId = await resolveCoachingId(user)

  const where = {
    coachingId,
  }

  if (filters.subject) {
    where.subject = filters.subject.trim()
  }

  if (filters.topic) {
    where.topic = filters.topic.trim()
  }

  if (filters.difficulty) {
    if (!ALLOWED_DIFFICULTIES.includes(filters.difficulty)) {
      throw createServiceError("difficulty must be one of easy, medium, hard", 400)
    }

    where.difficulty = filters.difficulty
  }

  const questions = await prisma.question.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      coachingId: true,
      subject: true,
      topic: true,
      questionText: true,
      questionImageUrl: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      correctOption: true,
      marks: true,
      negativeMarks: true,
      difficulty: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return questions
}

const verifyQuestionOwnership = async (questionId, coachingId) => {
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
}

const updateQuestion = async (questionId, payload, user) => {
  const coachingId = await resolveCoachingId(user)
  await verifyQuestionOwnership(questionId, coachingId)

  const updateData = {}

  if (payload.subject !== undefined) updateData.subject = payload.subject?.trim()
  if (payload.topic !== undefined) updateData.topic = payload.topic?.trim()
  if (payload.question_text !== undefined) updateData.questionText = payload.question_text?.trim()
  if (payload.question_image_url !== undefined) updateData.questionImageUrl = payload.question_image_url
  if (payload.option_a !== undefined) updateData.optionA = payload.option_a?.trim()
  if (payload.option_b !== undefined) updateData.optionB = payload.option_b?.trim()
  if (payload.option_c !== undefined) updateData.optionC = payload.option_c?.trim()
  if (payload.option_d !== undefined) updateData.optionD = payload.option_d?.trim()

  if (payload.correct_option !== undefined) {
    if (!ALLOWED_OPTIONS.includes(payload.correct_option)) {
      throw createServiceError("correct_option must be one of A, B, C, D", 400)
    }
    updateData.correctOption = payload.correct_option
  }

  if (payload.difficulty !== undefined) {
    if (!ALLOWED_DIFFICULTIES.includes(payload.difficulty)) {
      throw createServiceError("difficulty must be one of easy, medium, hard", 400)
    }
    updateData.difficulty = payload.difficulty
  }

  if (payload.marks !== undefined) {
    const marks = Number(payload.marks)
    if (!Number.isInteger(marks) || marks <= 0) {
      throw createServiceError("marks must be a positive integer", 400)
    }
    updateData.marks = marks
  }

  if (payload.negative_marks !== undefined) {
    const negativeMarks = Number(payload.negative_marks)
    if (!Number.isInteger(negativeMarks) || negativeMarks < 0) {
      throw createServiceError("negative_marks must be an integer greater than or equal to 0", 400)
    }
    updateData.negativeMarks = negativeMarks
  }

  if (Object.keys(updateData).length === 0) {
    throw createServiceError("no updatable fields provided", 400)
  }

  const updatedQuestion = await prisma.question.update({
    where: {
      id: questionId,
    },
    data: updateData,
    select: {
      id: true,
      coachingId: true,
      subject: true,
      topic: true,
      questionText: true,
      questionImageUrl: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      correctOption: true,
      marks: true,
      negativeMarks: true,
      difficulty: true,
      updatedAt: true,
    },
  })

  return updatedQuestion
}

const deleteQuestion = async (questionId, user) => {
  const coachingId = await resolveCoachingId(user)
  await verifyQuestionOwnership(questionId, coachingId)

  await prisma.question.delete({
    where: {
      id: questionId,
    },
  })

  return {
    id: questionId,
    deleted: true,
  }
}

const validateCsvRow = (row) => {
  const subject = row.subject?.trim()
  const topic = row.topic?.trim()
  const questionText = row.question_text?.trim()
  const optionA = row.option_a?.trim()
  const optionB = row.option_b?.trim()
  const optionC = row.option_c?.trim()
  const optionD = row.option_d?.trim()
  const correctOption = row.correct_option?.trim()
  const difficulty = row.difficulty?.trim()
  const marks = Number(row.marks)
  const negativeMarks =
    row.negative_marks === undefined || row.negative_marks === null || row.negative_marks === ""
      ? 0
      : Number(row.negative_marks)

  if (!subject) return { valid: false, message: "subject is required" }
  if (!topic) return { valid: false, message: "topic is required" }
  if (!questionText) return { valid: false, message: "question_text is required" }
  if (!optionA || !optionB || !optionC || !optionD) {
    return { valid: false, message: "all options are required" }
  }
  if (!ALLOWED_OPTIONS.includes(correctOption)) {
    return { valid: false, message: "correct_option must be A/B/C/D" }
  }
  if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
    return { valid: false, message: "difficulty must be easy/medium/hard" }
  }
  if (!Number.isFinite(marks)) {
    return { valid: false, message: "marks must be a number" }
  }
  if (!Number.isInteger(marks) || marks <= 0) {
    return { valid: false, message: "marks must be a positive integer" }
  }
  if (!Number.isFinite(negativeMarks) || !Number.isInteger(negativeMarks) || negativeMarks < 0) {
    return { valid: false, message: "negative_marks must be an integer >= 0" }
  }

  return {
    valid: true,
    data: {
      subject,
      topic,
      questionText,
      questionImageUrl: row.question_image_url?.trim() || null,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      marks,
      negativeMarks,
      difficulty,
    },
  }
}

const parseCsvRows = async (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = []

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject)
  })
}

const parseXlsxRows = (filePath) => {
  const workbook = xlsx.readFile(filePath)
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    return []
  }

  const firstSheet = workbook.Sheets[firstSheetName]
  return xlsx.utils.sheet_to_json(firstSheet, { defval: "" })
}

const readBulkRows = async (filePath) => {
  const extension = path.extname(filePath).toLowerCase()

  if (extension === ".xlsx") {
    return parseXlsxRows(filePath)
  }

  return parseCsvRows(filePath)
}

const bulkUploadQuestionsFromCsv = async (filePath, user) => {
  const coachingId = await resolveCoachingId(user)

  const validRows = []
  const errors = []
  let totalRows = 0

  const rows = await readBulkRows(filePath)

  rows.forEach((row, index) => {
    totalRows += 1
    const validation = validateCsvRow(row)

    if (!validation.valid) {
      errors.push({
        row: index + 2,
        message: validation.message,
      })
      return
    }

    validRows.push({
      coachingId,
      createdBy: user.id,
      ...validation.data,
    })
  })

  let uploaded = 0
  let insertFailedCount = 0

  for (let index = 0; index < validRows.length; index += BULK_INSERT_BATCH_SIZE) {
    const batch = validRows.slice(index, index + BULK_INSERT_BATCH_SIZE)

    try {
      const result = await prisma.question.createMany({
        data: batch,
      })

      uploaded += result.count
    } catch (error) {
      insertFailedCount += batch.length
      errors.push({
        row: `batch_${Math.floor(index / BULK_INSERT_BATCH_SIZE) + 1}`,
        message: "failed to insert one batch",
      })
    }
  }

  const validationFailed = totalRows - validRows.length

  return {
    uploaded,
    failed: validationFailed + insertFailedCount,
    errors,
  }
}

const getQuestionCsvTemplate = () => {
  return [
    "subject,topic,question_text,option_a,option_b,option_c,option_d,correct_option,marks,negative_marks,difficulty",
    "Math,Algebra,2+2=?,3,4,5,6,B,4,1,easy",
  ].join("\n")
}

module.exports = {
  addQuestion,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestionsFromCsv,
  getQuestionCsvTemplate,
}
