const prisma = require("../../db")
const { hashPassword, comparePassword } = require("../utils/hash")
const { generateToken } = require("../utils/jwt")
const {
  sendSuperAdminNotification,
  sendStudentRegistrationPendingEmail,
} = require("./email.service")

const ALLOWED_ROLES = ["student", "coaching_admin", "super_admin"]
const ALLOWED_REGISTER_ROLES = ["student", "coaching_admin"]

const createServiceError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const normalizeEmail = (email) => email.trim().toLowerCase()

const ensureUniqueUserByEmail = async (email) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  })

  if (existingUser) {
    throw createServiceError("email already exists", 409)
  }
}

const registerUser = async ({ email, password, role }) => {
  if (!email || !password || !role) {
    throw createServiceError("email, password and role are required", 400)
  }

  if (!ALLOWED_REGISTER_ROLES.includes(role)) {
    throw createServiceError("invalid role", 400)
  }

  const normalizedEmail = normalizeEmail(email)

  await ensureUniqueUserByEmail(normalizedEmail)

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })

  return user
}

const registerCoaching = async (payload) => {
  const instituteName = payload.institute_name || payload.name
  const adminName = payload.admin_name
  const email = payload.email || payload.contact_email
  const phone = payload.phone || payload.phone_number
  const password = payload.password

  if (!instituteName || !adminName || !email || !phone || !password) {
    throw createServiceError(
      "institute_name, admin_name, email, phone and password are required",
      400,
    )
  }

  const normalizedEmail = normalizeEmail(email)

  await ensureUniqueUserByEmail(normalizedEmail)

  const passwordHash = await hashPassword(password)

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "coaching_admin",
      },
      select: {
        id: true,
        email: true,
      },
    })

    const coachingInstitute = await tx.coachingInstitute.create({
      data: {
        userId: user.id,
        instituteName: instituteName.trim(),
        adminName: adminName.trim(),
        phoneNumber: phone.trim(),
      },
      select: {
        id: true,
        instituteName: true,
        adminName: true,
        status: true,
        createdAt: true,
      },
    })

    return {
      user,
      coachingInstitute,
    }
  })

  await sendSuperAdminNotification({
    instituteName: result.coachingInstitute.instituteName,
    adminName: result.coachingInstitute.adminName,
    email: result.user.email,
    phoneNumber: phone.trim(),
  })

  return {
    id: result.coachingInstitute.id,
    institute_name: result.coachingInstitute.instituteName,
    admin_name: result.coachingInstitute.adminName,
    email: result.user.email,
    phone: phone.trim(),
    status: result.coachingInstitute.status,
    created_at: result.coachingInstitute.createdAt,
  }
}

const registerStudent = async (payload) => {
  const name = payload.name
  const email = payload.email
  const phone = payload.phone || payload.phone_number
  const coachingId = payload.selected_coaching_id || payload.coaching_id || payload.coachingId
  const examPreparingFor = payload.exam_preparing_for || payload.examPreparingFor
  const password = payload.password

  if (!name || !email || !phone || !coachingId || !examPreparingFor || !password) {
    throw createServiceError(
      "name, email, phone, selected_coaching_id, exam_preparing_for and password are required",
      400,
    )
  }

  const normalizedEmail = normalizeEmail(email)

  const [coachingInstitute] = await Promise.all([
    prisma.coachingInstitute.findUnique({
      where: {
        id: coachingId,
      },
      select: {
        id: true,
        status: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    }),
    ensureUniqueUserByEmail(normalizedEmail),
  ])

  if (!coachingInstitute || coachingInstitute.status !== "approved") {
    throw createServiceError("selected coaching institute is unavailable", 400)
  }

  const passwordHash = await hashPassword(password)

  const student = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "student",
      },
      select: {
        id: true,
      },
    })

    return tx.student.create({
      data: {
        userId: user.id,
        name: name.trim(),
        phoneNumber: phone.trim(),
        coachingId,
        examPreparingFor: examPreparingFor.trim(),
      },
      select: {
        id: true,
        name: true,
        coachingId: true,
        examPreparingFor: true,
        status: true,
        createdAt: true,
      },
    })
  })

  if (coachingInstitute?.user?.email) {
    await sendStudentRegistrationPendingEmail({
      toEmail: coachingInstitute.user.email,
      studentName: student.name,
      studentEmail: normalizedEmail,
      examPreparingFor: student.examPreparingFor,
    })
  }

  return {
    id: student.id,
    name: student.name,
    selected_coaching_id: student.coachingId,
    exam_preparing_for: student.examPreparingFor,
    status: student.status,
    created_at: student.createdAt,
  }
}

const getApprovedCoachingOptions = async () => {
  return prisma.coachingInstitute.findMany({
    where: {
      status: "approved",
    },
    orderBy: {
      instituteName: "asc",
    },
    select: {
      id: true,
      instituteName: true,
    },
  })
}

const loginUser = async ({ email, password, role }) => {
  if (!email || !password || !role) {
    throw createServiceError("email, password and role are required", 400)
  }

  if (!ALLOWED_ROLES.includes(role)) {
    throw createServiceError("invalid role", 400)
  }

  const normalizedEmail = normalizeEmail(email)

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  })

  if (!user) {
    throw createServiceError("invalid credentials", 401)
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash)

  if (!isPasswordValid) {
    throw createServiceError("invalid credentials", 401)
  }

  if (user.role !== role) {
    throw createServiceError("invalid credentials for selected role", 401)
  }

  if (!user.isActive) {
    throw createServiceError("user account is inactive", 403)
  }

  if (user.role === "coaching_admin") {
    const coachingInstitute = await prisma.coachingInstitute.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        status: true,
      },
    })

    if (!coachingInstitute) {
      throw createServiceError("coaching profile not found", 403)
    }

    if (coachingInstitute.status !== "approved") {
      throw createServiceError("coaching account is pending super admin approval", 403)
    }
  }

  if (user.role === "student") {
    const student = await prisma.student.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        status: true,
      },
    })

    if (!student) {
      throw createServiceError("student profile not found", 403)
    }

    if (student.status !== "approved") {
      throw createServiceError("student account is pending coaching admin approval", 403)
    }
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
  })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  }
}

module.exports = {
  registerUser,
  registerCoaching,
  registerStudent,
  getApprovedCoachingOptions,
  loginUser,
  ALLOWED_ROLES,
}
