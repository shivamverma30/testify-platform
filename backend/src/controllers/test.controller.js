const testService = require("../services/test.service")
const { sendResponse, sendError } = require("../utils/controller")

const createTest = async (req, res) => {
  try {
    const result = await testService.createTest(req.body, req.user)
    return sendResponse(res, 201, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getTests = async (req, res) => {
  try {
    const result = await testService.getTests(req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getTestById = async (req, res) => {
  try {
    const result = await testService.getTestById(req.params.testId, req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getTestLeaderboard = async (req, res) => {
  try {
    const result = await testService.getTestLeaderboard(req.params.testId, req.user, req.query)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const updateTest = async (req, res) => {
  try {
    const result = await testService.updateTest(req.params.testId, req.body, req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const deleteTest = async (req, res) => {
  try {
    const result = await testService.deleteTest(req.params.testId, req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const updateTestSchedule = async (req, res) => {
  try {
    const result = await testService.updateTestSchedule(req.params.testId, req.body, req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const createTestSeries = async (req, res) => {
  try {
    const result = await testService.createTestSeries(req.body, req.user)
    return sendResponse(res, 201, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getTestSeries = async (req, res) => {
  try {
    const result = await testService.getTestSeries(req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getTestSeriesById = async (req, res) => {
  try {
    const result = await testService.getTestSeriesById(req.params.seriesId, req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const updateTestSeries = async (req, res) => {
  try {
    const result = await testService.updateTestSeries(req.params.seriesId, req.body, req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const deleteTestSeries = async (req, res) => {
  try {
    const result = await testService.deleteTestSeries(req.params.seriesId, req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const createSection = async (req, res) => {
  try {
    const result = await testService.createSection(req.params.testId, req.body, req.user)
    return sendResponse(res, 201, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getSections = async (req, res) => {
  try {
    const result = await testService.getSections(req.params.testId, req.user)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const addQuestionToSection = async (req, res) => {
  try {
    const result = await testService.addQuestionToSection(req.params.sectionId, req.body, req.user)
    return sendResponse(res, 201, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const removeQuestionFromSection = async (req, res) => {
  try {
    const result = await testService.removeQuestionFromSection(
      req.params.sectionId,
      req.params.questionId,
      req.user,
    )
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const generateAiTopicTest = async (req, res) => {
  try {
    const result = await testService.generateAiTopicTest(req.body)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const generateAiFullTest = async (req, res) => {
  try {
    const result = await testService.generateAiFullTest(req.body)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const createAiGeneratedTest = async (req, res) => {
  try {
    const result = await testService.createAiGeneratedTest(req.body, req.user)
    return sendResponse(res, 201, result)
  } catch (error) {
    return sendError(res, error)
  }
}

module.exports = {
  createTest,
  getTests,
  getTestById,
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