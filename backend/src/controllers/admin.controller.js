const adminService = require("../services/admin.service")

const getPendingStudents = async (req, res) => {
  try {
    const result = await adminService.getPendingStudents(req.user.id)

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

const getStudents = async (req, res) => {
  try {
    const status = req.query.status || "pending"
    const result = await adminService.getStudents(req.user.id, status)

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

const getStudentProfile = async (req, res) => {
  try {
    const result = await adminService.getStudentProfile(req.params.id, req.user.id)

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

const getDashboardAnalytics = async (req, res) => {
  try {
    const result = await adminService.getDashboardAnalytics(req.user.id)

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

const getTestAnalytics = async (req, res) => {
  try {
    const result = await adminService.getTestAnalytics(req.params.testId, req.user.id, req.query)

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

const approveStudent = async (req, res) => {
  try {
    const result = await adminService.approveStudent(req.params.id, req.user.id)

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

const rejectStudent = async (req, res) => {
  try {
    const result = await adminService.rejectStudent(req.params.id, req.user.id)

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
  getPendingStudents,
  getStudents,
  getStudentProfile,
  getDashboardAnalytics,
  getTestAnalytics,
  approveStudent,
  rejectStudent,
}
