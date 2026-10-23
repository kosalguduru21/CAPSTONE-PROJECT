/**
 * Centralized global error handling middleware in the exact style
 * of mern-ai-integration-patterns.
 */
export function errorHandler(err, req, res, next) {
  console.error("[API Error]", err);

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
}
