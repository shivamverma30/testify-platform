const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

const sendResponse = (res, statusCode, data, message) => {
  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    data,
    message,
  })
}

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500
  const message = error.message || "Something went wrong"

  return res.status(statusCode).json({
    success: false,
    message,
  })
}

module.exports = {
  asyncHandler,
  sendResponse,
  sendError,
}
