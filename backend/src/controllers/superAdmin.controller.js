const superAdminService = require("../services/superAdmin.service")
const { sendResponse, sendError } = require("../utils/controller")

const getPendingCoachings = async (req, res) => {
  try {
    const result = await superAdminService.getPendingCoachings()
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const approveCoaching = async (req, res) => {
  try {
    const result = await superAdminService.approveCoaching(req.params.id, req.user.id)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const rejectCoaching = async (req, res) => {
  try {
    const result = await superAdminService.rejectCoaching(req.params.id, req.user.id)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getDashboardStats = async (req, res) => {
  try {
    const result = await superAdminService.getDashboardStats()
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const getCoachingManagement = async (req, res) => {
  try {
    const result = await superAdminService.getCoachingManagement()
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

module.exports = {
  getPendingCoachings,
  approveCoaching,
  rejectCoaching,
  getDashboardStats,
  getCoachingManagement,
}
