const express = require("express")
const superAdminController = require("../controllers/superAdmin.controller")
const { authenticateUser, requireRole } = require("../middleware/auth.middleware")

const router = express.Router()

router.use(authenticateUser, requireRole("super_admin"))

router.get("/coaching/pending", superAdminController.getPendingCoachings)
router.patch("/coaching/:id/approve", superAdminController.approveCoaching)
router.patch("/coaching/:id/reject", superAdminController.rejectCoaching)
router.get("/dashboard/stats", superAdminController.getDashboardStats)
router.get("/coaching", superAdminController.getCoachingManagement)

module.exports = router
