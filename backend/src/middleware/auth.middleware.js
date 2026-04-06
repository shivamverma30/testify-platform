const { verifyToken } = require("../utils/jwt")
const prisma = require("../../db")

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "authorization token is required",
      })
    }

    const token = authHeader.split(" ")[1]
    const payload = verifyToken(token)

    const user = {
      id: payload.userId,
      role: payload.role,
    }

    if (payload.role === "coaching_admin") {
      const coachingInstitute = await prisma.coachingInstitute.findUnique({
        where: {
          userId: payload.userId,
        },
        select: {
          id: true,
        },
      })

      user.coaching_id = coachingInstitute?.id || null
      user.coachingId = coachingInstitute?.id || null
    }

    if (payload.role === "student") {
      const student = await prisma.student.findUnique({
        where: {
          userId: payload.userId,
        },
        select: {
          coachingId: true,
        },
      })

      user.coaching_id = student?.coachingId || null
      user.coachingId = student?.coachingId || null
    }

    req.user = user

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "invalid or expired token",
    })
  }
}

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "unauthorized",
      })
    }

    const allowedRoles = Array.isArray(role) ? role : [role]

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "forbidden",
      })
    }

    next()
  }
}

module.exports = {
  authenticateUser,
  requireRole,
}
