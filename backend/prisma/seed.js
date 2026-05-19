const path = require("path")
const dotenv = require("dotenv")
const bcrypt = require("bcrypt")
const { PrismaClient } = require("@prisma/client")

dotenv.config({ path: path.join(__dirname, "../.env") })

const prisma = new PrismaClient()

const main = async () => {
  const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL
  const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD

  if (!SUPER_ADMIN_EMAIL) {
    console.error("SUPER_ADMIN_EMAIL is not set in .env file")
    process.exit(1)
  }

  if (!SUPER_ADMIN_PASSWORD) {
    console.error("SUPER_ADMIN_PASSWORD is not set in .env file")
    process.exit(1)
  }

  const normalizedEmail = SUPER_ADMIN_EMAIL.toLowerCase()

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  })

  if (existingUser) {
    console.log("Super admin user already exists")
    return
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10)

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: "super_admin",
      isActive: true,
    },
  })

  console.log(`Super admin created: ${user.email}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
