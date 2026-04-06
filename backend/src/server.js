const express = require("express")
const cors = require("cors")
const pool = require("./config/db")
const authRoutes = require("./routes/auth.routes")
const coachingRoutes = require("./routes/coaching.routes")
const {
  studentRouter,
  studentTestRouter,
  studentDashboardRouter,
  studentMarketplaceRouter,
} = require("./routes/student.routes")
const adminRoutes = require("./routes/admin.routes")
const superAdminRoutes = require("./routes/superAdmin.routes")
const questionRoutes = require("./routes/question.routes")
const { testRouter, sectionRouter } = require("./routes/test.routes")
const examRoutes = require("./modules/exam/exam.routes")

const app = express()

app.use(cors())
app.use(express.json())

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" })
})

app.use("/api/auth", authRoutes)
app.use("/api/coaching", coachingRoutes)
app.use("/api/students", studentRouter)
app.use("/api/student/tests", studentTestRouter)
app.use("/api/student", studentDashboardRouter)
app.use("/api/student", studentMarketplaceRouter)
app.use("/api/admin", adminRoutes)
app.use("/api/super-admin", superAdminRoutes)
app.use("/api/questions", questionRoutes)
app.use("/api/tests", testRouter)
app.use("/api/sections", sectionRouter)
app.use("/api/exam", examRoutes)

app.get("/", (req,res)=>{
    res.send("Testify Backend Running")
})

app.get("/testdb", async (req, res) => {
  await pool.$connect()
  res.json({ status: "connected", provider: "prisma" })
})

const PORT = process.env.PORT || 5000

app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`)
})