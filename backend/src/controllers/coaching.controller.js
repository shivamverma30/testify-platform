const coachingService = require("../services/coaching.service")
const { sendResponse, sendError } = require("../utils/controller")

const registerCoaching = async (req, res) => {
  try {
    const result = await coachingService.registerCoachingInstitute(req.body)
    return sendResponse(res, 201, result)
  } catch (error) {
    return sendError(res, error)
  }
}

const approveStudent = async (req, res) => {
  try {
    const result = await coachingService.approveStudentByCoachingAdmin(req.params.id, req.user.id)
    return sendResponse(res, 200, result)
  } catch (error) {
    return sendError(res, error)
  }
}

module.exports = {
  registerCoaching,
  approveStudent,
}
