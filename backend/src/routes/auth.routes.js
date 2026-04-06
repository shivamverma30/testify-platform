const express = require("express")
const authController = require("../controllers/auth.controller")

const router = express.Router()

router.post("/register", authController.register)
router.post("/register-coaching", authController.registerCoaching)
router.post("/register-student", authController.registerStudent)
router.get("/coaching-options", authController.getApprovedCoachings)
router.post("/login", authController.login)

module.exports = router
