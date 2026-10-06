import { env } from "../config/env.js";

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  console.error(`[error] ${req.method} ${req.originalUrl}`, err);

  res.status(status).json({
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: err.message || "Something went wrong",
      ...(err.details && { details: err.details }),
      ...(env.nodeEnv === "development" && { stack: err.stack }),
    },
  });
}
