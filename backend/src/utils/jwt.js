const jwt = require("jsonwebtoken")

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured")
  }

  return process.env.JWT_SECRET
}

const generateToken = (payload) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  })
}

const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret())
}

module.exports = {
  generateToken,
  verifyToken,
}
