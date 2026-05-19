const authService = require("../services/auth.service")
const { sendResponse, sendError } = require("../utils/controller")

const register = async (req, res) => {
  try {
    const user = await authService.registerUser(req.body)
    return sendResponse(res, 201, user)
  } catch (error) {
    return sendError(res, error)
  }
}

const login = async (req, res) => {
  try {
    const result = await authService.loginUser(req.body)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const registerCoaching = async (req, res) => {
  try {
    const result = await authService.registerCoaching(req.body)
    return sendResponse(res, 201, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const registerStudent = async (req, res) => {
  try {
    const result = await authService.registerStudent(req.body)
    return sendResponse(res, 201, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getApprovedCoachings = async (req, res) => {
  try {
    const result = await authService.getApprovedCoachingOptions()
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

module.exports = {
  register,
  registerCoaching,
  registerStudent,
  getApprovedCoachings,
  login,
}
