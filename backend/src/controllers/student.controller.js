const studentService = require("../services/student.service")

const registerStudent = async (req, res) => {
  try {
    const result = await studentService.registerStudent(req.body)

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

const getAvailableTests = async (req, res) => {
  try {
    const result = await studentService.getAvailableTests(req.user)

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

const getUpcomingTests = async (req, res) => {
  try {
    const result = await studentService.getUpcomingTests(req.user)

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

const getPastTests = async (req, res) => {
  try {
    const result = await studentService.getPastTests(req.user)

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

const getDashboardOverview = async (req, res) => {
  try {
    const result = await studentService.getDashboardOverview(req.user)

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

const getScheduledTests = async (req, res) => {
  try {
    const result = await studentService.getScheduledTests(req.user)

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

const getAttemptHistory = async (req, res) => {
  try {
    const result = await studentService.getAttemptHistory(req.user)

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

const getResultsList = async (req, res) => {
  try {
    const result = await studentService.getResultsList(req.user)

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

const getResultById = async (req, res) => {
  try {
    const result = await studentService.getResultById(req.params.resultId, req.user)

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

const getPerformanceAnalytics = async (req, res) => {
  try {
    const result = await studentService.getPerformanceAnalytics(req.user)

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

const getMyTestSeries = async (req, res) => {
  try {
    const result = await studentService.getMyTestSeries(req.user)

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

const getExploreTestSeries = async (req, res) => {
  try {
    const result = await studentService.getExploreTestSeries()

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

const purchaseTestSeries = async (req, res) => {
  try {
    const result = await studentService.purchaseTestSeries(req.body, req.user)

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

const getStudentProfile = async (req, res) => {
  try {
    const result = await studentService.getStudentProfile(req.user)

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

const updateStudentProfile = async (req, res) => {
  try {
    const result = await studentService.updateStudentProfile(req.body, req.user)

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
