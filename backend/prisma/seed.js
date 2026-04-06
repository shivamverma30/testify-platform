const path = require("path")
const dotenv = require("dotenv")
const bcrypt = require("bcrypt")
const { PrismaClient } = require("@prisma/client")

dotenv.config({ path: path.join(__dirname, "../.env") })

const prisma = new PrismaClient()

const SUPER_ADMIN_EMAIL = "shivam3006.nitb@gmail.com"
const SUPER_ADMIN_PASSWORD = 'Hh>vT5FZ$1DW0^YS"hY"Xj?£'

const main = async () => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: SUPER_ADMIN_EMAIL,
    },
    select: {
      id: true,
    },
  })

  if (existingUser) {
    console.log("Super admin user already exists.")
    return
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10)

  await prisma.user.create({
    data: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      role: "super_admin",
    },
  })

  console.log("Super admin user created.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
