const adminService = require("../services/admin.service")
const { sendResponse, sendError } = require("../utils/controller")

const getPendingStudents = async (req, res) => {
  try {
    const result = await adminService.getPendingStudents(req.user.id)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getStudents = async (req, res) => {
  try {
    const status = req.query.status || "pending"
    const result = await adminService.getStudents(req.user.id, status)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getStudentProfile = async (req, res) => {
  try {
    const result = await adminService.getStudentProfile(req.params.id, req.user.id)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getDashboardAnalytics = async (req, res) => {
  try {
    const result = await adminService.getDashboardAnalytics(req.user.id)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getTestAnalytics = async (req, res) => {
  try {
    const result = await adminService.getTestAnalytics(req.params.testId, req.user.id, req.query)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const approveStudent = async (req, res) => {
  try {
    const result = await adminService.approveStudent(req.params.id, req.user.id)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const rejectStudent = async (req, res) => {
  try {
    const result = await adminService.rejectStudent(req.params.id, req.user.id)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
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
