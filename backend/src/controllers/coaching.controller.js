const coachingService = require("../services/coaching.service")

const registerCoaching = async (req, res) => {
  try {
    const result = await coachingService.registerCoachingInstitute(req.body)

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

const approveStudent = async (req, res) => {
  try {
    const result = await coachingService.approveStudentByCoachingAdmin(req.params.id, req.user.id)

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
  registerCoaching,
  approveStudent,
}
