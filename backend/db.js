const dotenv = require("dotenv");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

dotenv.config({ path: path.join(__dirname, ".env") });

const globalForPrisma = global;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in backend/.env");
}

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;