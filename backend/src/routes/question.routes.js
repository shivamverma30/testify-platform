const express = require("express")
const path = require("path")
const fs = require("fs")
const multer = require("multer")
const questionController = require("../controllers/question.controller")
const { authenticateUser, requireRole } = require("../middleware/auth.middleware")

const router = express.Router()

const uploadDirectory = path.join(__dirname, "../../uploads")

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		fs.mkdirSync(uploadDirectory, { recursive: true })
		cb(null, uploadDirectory)
	},
	filename: (req, file, cb) => {
		const safeFileName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`
		cb(null, safeFileName)
	},
})

const fileFilter = (req, file, cb) => {
	const isCsvMimeType =
		file.mimetype === "text/csv" ||
		file.mimetype === "application/csv" ||
		file.mimetype === "application/vnd.ms-excel"

	const isXlsxMimeType =
		file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

	const isCsvExtension = path.extname(file.originalname).toLowerCase() === ".csv"
	const isXlsxExtension = path.extname(file.originalname).toLowerCase() === ".xlsx"

	if (!isCsvMimeType && !isCsvExtension && !isXlsxMimeType && !isXlsxExtension) {
		return cb(new Error("Only CSV and XLSX files are allowed"))
	}

	cb(null, true)
}

const upload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024,
	},
	fileFilter,
})

router.use(authenticateUser, requireRole("coaching_admin"))

router.post("/", questionController.addQuestion)
router.post("/bulk-upload", upload.single("file"), questionController.bulkUploadQuestions)
router.get("/template", questionController.downloadQuestionTemplate)
router.get("/", questionController.getQuestions)
router.put("/:id", questionController.updateQuestion)
router.delete("/:id", questionController.deleteQuestion)

module.exports = router
