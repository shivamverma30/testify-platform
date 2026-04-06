const express = require("express")
const studentController = require("../controllers/student.controller")
const { authenticateUser, requireRole } = require("../middleware/auth.middleware")

const studentRouter = express.Router()
const studentTestRouter = express.Router()
const studentDashboardRouter = express.Router()
const studentMarketplaceRouter = express.Router()

studentRouter.post("/register", studentController.registerStudent)

studentTestRouter.use(authenticateUser, requireRole("student"))
studentDashboardRouter.use(authenticateUser, requireRole("student"))
studentMarketplaceRouter.use(authenticateUser, requireRole("student"))

studentTestRouter.get("/available", studentController.getAvailableTests)
studentTestRouter.get("/upcoming", studentController.getUpcomingTests)
studentTestRouter.get("/past", studentController.getPastTests)

studentDashboardRouter.get("/dashboard/overview", studentController.getDashboardOverview)
studentDashboardRouter.get("/scheduled-tests", studentController.getScheduledTests)
studentDashboardRouter.get("/attempt-history", studentController.getAttemptHistory)
studentDashboardRouter.get("/results", studentController.getResultsList)
studentDashboardRouter.get("/results/:resultId", studentController.getResultById)
studentDashboardRouter.get("/analytics", studentController.getPerformanceAnalytics)
studentDashboardRouter.get("/my-test-series", studentController.getMyTestSeries)
studentDashboardRouter.get("/profile", studentController.getStudentProfile)
studentDashboardRouter.patch("/profile", studentController.updateStudentProfile)

studentMarketplaceRouter.get("/explore-test-series", studentController.getExploreTestSeries)
studentMarketplaceRouter.post("/purchases", studentController.purchaseTestSeries)

module.exports = {
	studentRouter,
	studentTestRouter,
	studentDashboardRouter,
	studentMarketplaceRouter,
}
