const examService = require("./exam.service")
const { sendResponse, sendError } = require("../../utils/controller")

const startAttempt = async (req, res) => {
  try {
    const result = await examService.startAttempt(req.body, req.user)
    return sendResponse(res, 201, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getExamData = async (req, res) => {
  try {
    const result = await examService.getExamData(req.params.testId, req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const saveAnswer = async (req, res) => {
  try {
    const result = await examService.saveAnswer(req.body, req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const submitAttempt = async (req, res) => {
  try {
    const result = await examService.submitAttempt(req.body, req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getResultByAttempt = async (req, res) => {
  try {
    const result = await examService.getResultByAttempt(req.params.attemptId, req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

module.exports = {
  startAttempt,
  getExamData,
  saveAnswer,
  submitAttempt,
  getResultByAttempt,
}
