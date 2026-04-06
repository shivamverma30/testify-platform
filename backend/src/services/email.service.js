const nodemailer = require("nodemailer")

const SUPER_ADMIN_EMAIL = "shivam3006.nitb@gmail.com"

const isEmailConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  )
}

const createTransporter = () => {
  if (!isEmailConfigured()) {
    return null
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const sendMail = async ({ to, subject, text }) => {
  const transporter = createTransporter()

  if (!transporter) {
    console.warn("[email] SMTP not configured. Skipping email.")
    return
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
    })
  } catch (error) {
    console.error("[email] Failed to send email:", error.message)
  }
}

const sendSuperAdminNotification = async ({
  instituteName,
  adminName,
  email,
  phoneNumber,
}) => {
  const subject = "New Coaching Registration Request"
  const text = [
    "A new coaching institute registration is pending review.",
    "",
    `Institute name: ${instituteName}`,
    `Admin name: ${adminName}`,
    `Email: ${email}`,
    `Phone number: ${phoneNumber}`,
  ].join("\n")

  await sendMail({
    to: SUPER_ADMIN_EMAIL,
    subject,
    text,
  })
}

const sendCoachingApprovalEmail = async ({ toEmail, instituteName }) => {
  const subject = "Your Coaching Institute Has Been Approved on Testify"
  const text = [
    `Hello ${instituteName},`,
    "",
    "Your coaching institute has been approved on Testify.",
    "You can now login and access your coaching admin dashboard.",
  ].join("\n")

  await sendMail({
    to: toEmail,
    subject,
    text,
  })
}

const sendStudentRegistrationPendingEmail = async ({
  toEmail,
  studentName,
  studentEmail,
  examPreparingFor,
}) => {
  const subject = "New Student Registration Pending Approval"
  const text = [
    "A new student registration is pending approval.",
    "",
    `Student name: ${studentName}`,
    `Student email: ${studentEmail}`,
    `Exam preparing for: ${examPreparingFor}`,
  ].join("\n")

  await sendMail({
    to: toEmail,
    subject,
    text,
  })
}

const sendStudentApprovalEmail = async ({ toEmail, studentName }) => {
  const subject = "Your Testify Account Has Been Approved"
  const text = [
    `Hello ${studentName},`,
    "",
    "Your Testify account has been approved.",
    "You can now login and start using the platform.",
  ].join("\n")

  await sendMail({
    to: toEmail,
    subject,
    text,
  })
}

const sendStudentRejectionEmail = async ({ toEmail, studentName }) => {
  const subject = "Your Testify Account Request Was Rejected"
  const text = [
    `Hello ${studentName},`,
    "",
    "Your Testify account request has been rejected by your coaching institute.",
    "Please contact your coaching admin for more details.",
  ].join("\n")

  await sendMail({
    to: toEmail,
    subject,
    text,
  })
}

const sendTestScheduledEmail = async ({
  toEmail,
  studentName,
  testTitle,
  scheduledStart,
  scheduledEnd,
}) => {
  const subject = "New Test Schedule Published on Testify"
  const text = [
    `Hello ${studentName},`,
    "",
    `A test has been scheduled by your coaching institute: ${testTitle}`,
    `Start time: ${new Date(scheduledStart).toLocaleString("en-IN")}`,
    `End time: ${new Date(scheduledEnd).toLocaleString("en-IN")}`,
    "",
    "Please login to your student dashboard and attempt the test within the schedule window.",
  ].join("\n")

  await sendMail({
    to: toEmail,
    subject,
    text,
  })
}

module.exports = {
  sendSuperAdminNotification,
  sendCoachingApprovalEmail,
  sendStudentRegistrationPendingEmail,
  sendStudentApprovalEmail,
  sendStudentRejectionEmail,
  sendTestScheduledEmail,
}
