const prisma = require("../../db")
const { hashPassword } = require("../utils/hash")

const createServiceError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const registerCoachingInstitute = async (payload) => {
  const {
    name,
    address,
    contact_email: contactEmail,
    password,
    admin_name: adminName,
    phone_number: phoneNumber,
  } = payload

  if (!name || !contactEmail || !password) {
    throw createServiceError("name, contact_email and password are required", 400)
  }

  const normalizedEmail = contactEmail.trim().toLowerCase()

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (existingUser) {
    throw createServiceError("email already exists", 409)
  }

  const passwordHash = await hashPassword(password)

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "coaching_admin",
      },
    })

    const coachingInstitute = await tx.coachingInstitute.create({
      data: {
        userId: user.id,
        instituteName: name.trim(),
        adminName: adminName?.trim() || name.trim(),
        phoneNumber: phoneNumber?.trim() || "NA",
      },
      select: {
        id: true,
        instituteName: true,
        status: true,
        createdAt: true,
      },
    })

    return { user, coachingInstitute }
  })

  return {
    institute: {
      id: result.coachingInstitute.id,
      name: result.coachingInstitute.instituteName,
      status: result.coachingInstitute.status,
      contact_email: normalizedEmail,
      address: address || null,
      created_at: result.coachingInstitute.createdAt,
    },
    message: "Institute registered and awaiting super_admin approval",
  }
}

const approveStudentByCoachingAdmin = async (studentId, coachingAdminUserId) => {
  const coachingInstitute = await prisma.coachingInstitute.findUnique({
    where: {
      userId: coachingAdminUserId,
    },
    select: {
      id: true,
    },
  })

  if (!coachingInstitute) {
    throw createServiceError("coaching_admin profile not found", 403)
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      coachingId: true,
      status: true,
    },
  })

  if (!student) {
    throw createServiceError("student not found", 404)
  }

  if (student.coachingId !== coachingInstitute.id) {
    throw createServiceError("forbidden", 403)
  }

  if (student.status !== "pending") {
    throw createServiceError("student is not in pending state", 400)
  }

  const approvedStudent = await prisma.student.update({
    where: { id: studentId },
    data: {
      status: "approved",
      approvedBy: coachingAdminUserId,
      approvedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      status: true,
      coachingId: true,
      approvedAt: true,
    },
  })

  return approvedStudent
}

module.exports = {
  registerCoachingInstitute,
  approveStudentByCoachingAdmin,
}
