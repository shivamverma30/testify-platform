const superAdminService = require("../services/superAdmin.service")

const getPendingCoachings = async (req, res) => {
  try {
    const result = await superAdminService.getPendingCoachings()

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

const approveCoaching = async (req, res) => {
  try {
    const result = await superAdminService.approveCoaching(req.params.id, req.user.id)

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

const rejectCoaching = async (req, res) => {
  try {
    const result = await superAdminService.rejectCoaching(req.params.id, req.user.id)

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

const getDashboardStats = async (req, res) => {
  try {
    const result = await superAdminService.getDashboardStats()

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

const getCoachingManagement = async (req, res) => {
  try {
    const result = await superAdminService.getCoachingManagement()

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
  getPendingCoachings,
  approveCoaching,
  rejectCoaching,
  getDashboardStats,
  getCoachingManagement,
}
