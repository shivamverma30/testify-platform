const testService = require("../services/test.service")

const createTest = async (req, res) => {
  try {
    const result = await testService.createTest(req.body, req.user)

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

const getTests = async (req, res) => {
  try {
    const result = await testService.getTests(req.user)

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

const getTestLeaderboard = async (req, res) => {
  try {
    const result = await testService.getTestLeaderboard(req.params.testId, req.user, req.query)

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

const updateTest = async (req, res) => {
  try {
    const result = await testService.updateTest(req.params.testId, req.body, req.user)

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

const deleteTest = async (req, res) => {
  try {
    const result = await testService.deleteTest(req.params.testId, req.user)

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

const updateTestSchedule = async (req, res) => {
  try {
    const result = await testService.updateTestSchedule(req.params.testId, req.body, req.user)

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

const createTestSeries = async (req, res) => {
  try {
    const result = await testService.createTestSeries(req.body, req.user)

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

const getTestSeries = async (req, res) => {
  try {
    const result = await testService.getTestSeries(req.user)

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

const getTestSeriesById = async (req, res) => {
  try {
    const result = await testService.getTestSeriesById(req.params.seriesId, req.user)

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

const updateTestSeries = async (req, res) => {
  try {
    const result = await testService.updateTestSeries(req.params.seriesId, req.body, req.user)

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

const deleteTestSeries = async (req, res) => {
  try {
    const result = await testService.deleteTestSeries(req.params.seriesId, req.user)

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

const createSection = async (req, res) => {
  try {
    const result = await testService.createSection(req.params.testId, req.body, req.user)

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

const getSections = async (req, res) => {
  try {
    const result = await testService.getSections(req.params.testId, req.user)

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

const addQuestionToSection = async (req, res) => {
  try {
    const result = await testService.addQuestionToSection(req.params.sectionId, req.body, req.user)

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

const removeQuestionFromSection = async (req, res) => {
  try {
    const result = await testService.removeQuestionFromSection(
      req.params.sectionId,
      req.params.questionId,
      req.user,
    )

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

const generateAiTopicTest = async (req, res) => {
  try {
    const result = await testService.generateAiTopicTest(req.body)

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

const generateAiFullTest = async (req, res) => {
  try {
    const result = await testService.generateAiFullTest(req.body)

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

const createAiGeneratedTest = async (req, res) => {
  try {
    const result = await testService.createAiGeneratedTest(req.body, req.user)

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