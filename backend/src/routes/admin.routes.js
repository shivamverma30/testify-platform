const express = require("express")
const adminController = require("../controllers/admin.controller")
const { authenticateUser, requireRole } = require("../middleware/auth.middleware")

const router = express.Router()

router.use(authenticateUser, requireRole("coaching_admin"))

router.get("/students", adminController.getStudents)
router.get("/students/pending", adminController.getPendingStudents)
router.get("/students/:id/profile", adminController.getStudentProfile)
router.patch("/students/:id/approve", adminController.approveStudent)
router.patch("/students/:id/reject", adminController.rejectStudent)
router.get("/analytics", adminController.getDashboardAnalytics)
router.get("/tests/:testId/analytics", adminController.getTestAnalytics)

module.exports = router
