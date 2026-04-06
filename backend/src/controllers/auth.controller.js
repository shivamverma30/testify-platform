const authService = require("../services/auth.service")

const register = async (req, res) => {
  try {
    const user = await authService.registerUser(req.body)

    return res.status(201).json({
      success: true,
      data: user,
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "something went wrong",
    })
  }
}

const login = async (req, res) => {
  try {
    const result = await authService.loginUser(req.body)

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

const registerCoaching = async (req, res) => {
  try {
    const result = await authService.registerCoaching(req.body)

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

const registerStudent = async (req, res) => {
  try {
    const result = await authService.registerStudent(req.body)

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

const getApprovedCoachings = async (req, res) => {
  try {
    const result = await authService.getApprovedCoachingOptions()

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
  register,
  registerCoaching,
  registerStudent,
  getApprovedCoachings,
  login,
}
