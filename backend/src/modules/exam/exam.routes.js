const express = require("express")
const { authenticateUser, requireRole } = require("../../middleware/auth.middleware")
const examController = require("./exam.controller")

const examRouter = express.Router()

examRouter.use(authenticateUser, requireRole("student"))

examRouter.post("/start", examController.startAttempt)
examRouter.post("/save-answer", examController.saveAnswer)
examRouter.post("/submit", examController.submitAttempt)
examRouter.get("/result/:attemptId", examController.getResultByAttempt)
examRouter.get("/:testId", examController.getExamData)

module.exports = examRouter
