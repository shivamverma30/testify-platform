const examService = require("./exam.service")

const startAttempt = async (req, res) => {
  try {
    const result = await examService.startAttempt(req.body, req.user)

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

const getExamData = async (req, res) => {
  try {
    const result = await examService.getExamData(req.params.testId, req.user)

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

const saveAnswer = async (req, res) => {
  try {
    const result = await examService.saveAnswer(req.body, req.user)

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

const submitAttempt = async (req, res) => {
  try {
    const result = await examService.submitAttempt(req.body, req.user)

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

const getResultByAttempt = async (req, res) => {
  try {
    const result = await examService.getResultByAttempt(req.params.attemptId, req.user)

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
  startAttempt,
  getExamData,
  saveAnswer,
  submitAttempt,
  getResultByAttempt,
}
