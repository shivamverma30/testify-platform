const questionService = require("../services/question.service")
const fs = require("fs/promises")

const addQuestion = async (req, res) => {
  try {
    const result = await questionService.addQuestion(req.body, req.user)

    return res.status(201).json({
      success: true,
      data: result,
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "something went wrong",
    })
  }
}

const getQuestions = async (req, res) => {
  try {
    const result = await questionService.getQuestions(req.query, req.user)

    return res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "something went wrong",
    })
  }
}

const updateQuestion = async (req, res) => {
  try {
    const result = await questionService.updateQuestion(req.params.id, req.body, req.user)

    return res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "something went wrong",
    })
  }
}

const deleteQuestion = async (req, res) => {
  try {
    const result = await questionService.deleteQuestion(req.params.id, req.user)

    return res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "something went wrong",
    })
  }
}

const bulkUploadQuestions = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "CSV or XLSX file is required",
    })
  }

  try {
    const summary = await questionService.bulkUploadQuestionsFromCsv(req.file.path, req.user)

    return res.status(200).json({
      success: true,
      uploaded: summary.uploaded,
      failed: summary.failed,
      errors: summary.errors,
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "something went wrong",
    })
  } finally {
    try {
      await fs.unlink(req.file.path)
    } catch (error) {
      // ignore cleanup error
    }
  }
}

const downloadQuestionTemplate = async (req, res) => {
  try {
    const templateCsv = questionService.getQuestionCsvTemplate()

    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", "attachment; filename=question-upload-template.csv")

    return res.status(200).send(templateCsv)
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "something went wrong",
    })
  }
}

module.exports = {
  addQuestion,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestions,
  downloadQuestionTemplate,
}
