const prisma = require("../../db")
const { sendCoachingApprovalEmail } = require("./email.service")

const createServiceError = (message, statusCode) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const getPendingCoachings = async () => {
  return prisma.coachingInstitute.findMany({
    where: {
      status: "pending",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      instituteName: true,
      adminName: true,
      phoneNumber: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  })
}

const resolvePendingCoaching = async (coachingInstituteId) => {
  const coachingInstitute = await prisma.coachingInstitute.findUnique({
    where: {
      id: coachingInstituteId,
    },
    select: {
      id: true,
      status: true,
    },
  })

  if (!coachingInstitute) {
    throw createServiceError("coaching institute not found", 404)
  }

  if (coachingInstitute.status !== "pending") {
    throw createServiceError("coaching institute is not in pending state", 400)
  }

  return coachingInstitute.id
}

const approveCoaching = async (coachingInstituteId, superAdminUserId) => {
  const resolvedCoachingId = await resolvePendingCoaching(coachingInstituteId)

  const approvedCoaching = await prisma.coachingInstitute.update({
    where: {
      id: resolvedCoachingId,
    },
    data: {
      status: "approved",
      approvedBy: superAdminUserId,
      approvedAt: new Date(),
      rejectionReason: null,
    },
    select: {
      id: true,
      instituteName: true,
      status: true,
      approvedAt: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  })

  if (approvedCoaching.user?.email) {
    await sendCoachingApprovalEmail({
      toEmail: approvedCoaching.user.email,
      instituteName: approvedCoaching.instituteName,
    })
  }

  return {
    id: approvedCoaching.id,
    instituteName: approvedCoaching.instituteName,
    status: approvedCoaching.status,
    approvedAt: approvedCoaching.approvedAt,
  }
}

const rejectCoaching = async (coachingInstituteId, superAdminUserId) => {
  const resolvedCoachingId = await resolvePendingCoaching(coachingInstituteId)

  return prisma.coachingInstitute.update({
    where: {
      id: resolvedCoachingId,
    },
    data: {
      status: "rejected",
      approvedBy: superAdminUserId,
      approvedAt: new Date(),
      rejectionReason: "Rejected by super admin",
    },
    select: {
      id: true,
      instituteName: true,
      status: true,
      approvedAt: true,
    },
  })
}

const getDashboardStats = async () => {
  const [totalCoachings, totalStudents, totalTests, pendingCoachings, pendingStudents] = await Promise.all([
    prisma.coachingInstitute.count(),
    prisma.student.count(),
    prisma.test.count(),
    prisma.coachingInstitute.count({ where: { status: "pending" } }),
    prisma.student.count({ where: { status: "pending" } }),
  ])

  return {
    total_coaching_institutes: totalCoachings,
    total_students: totalStudents,
    total_tests: totalTests,
    pending_coaching_approvals: pendingCoachings,
    pending_student_approvals: pendingStudents,
  }
}

const getCoachingManagement = async () => {
  return prisma.coachingInstitute.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      instituteName: true,
      adminName: true,
      phoneNumber: true,
      status: true,
      createdAt: true,
      approvedAt: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  })
}

module.exports = {
  getPendingCoachings,
  approveCoaching,
  rejectCoaching,
  getDashboardStats,
  getCoachingManagement,
}
