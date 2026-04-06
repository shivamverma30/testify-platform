const express = require("express")
const testController = require("../controllers/test.controller")
const { authenticateUser, requireRole } = require("../middleware/auth.middleware")

const testRouter = express.Router()
const sectionRouter = express.Router()

testRouter.get("/:testId/leaderboard", authenticateUser, requireRole(["coaching_admin", "student"]), testController.getTestLeaderboard)

testRouter.use(authenticateUser, requireRole("coaching_admin"))
sectionRouter.use(authenticateUser, requireRole("coaching_admin"))

testRouter.post("/", testController.createTest)
testRouter.get("/", testController.getTests)
testRouter.patch("/:testId", testController.updateTest)
testRouter.delete("/:testId", testController.deleteTest)
testRouter.patch("/:testId/schedule", testController.updateTestSchedule)

testRouter.post("/series", testController.createTestSeries)
testRouter.get("/series", testController.getTestSeries)
testRouter.get("/series/:seriesId", testController.getTestSeriesById)
testRouter.patch("/series/:seriesId", testController.updateTestSeries)
testRouter.delete("/series/:seriesId", testController.deleteTestSeries)

testRouter.post("/:testId/sections", testController.createSection)
testRouter.get("/:testId/sections", testController.getSections)

sectionRouter.post("/:sectionId/questions", testController.addQuestionToSection)
sectionRouter.delete("/:sectionId/questions/:questionId", testController.removeQuestionFromSection)

module.exports = {
  testRouter,
  sectionRouter,
}