const express = require("express")
const coachingController = require("../controllers/coaching.controller")
const { authenticateUser, requireRole } = require("../middleware/auth.middleware")

const router = express.Router()

router.post("/register", coachingController.registerCoaching)
router.patch(
  "/approve-student/:id",
  authenticateUser,
  requireRole("coaching_admin"),
  coachingController.approveStudent,
)

module.exports = router
