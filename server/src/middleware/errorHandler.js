import { env } from "../config/env.js";

export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    message: error.message || "Something went wrong",
    code: error.code,
    details: error.details,
    stack: env.NODE_ENV === "production" ? undefined : error.stack
  });
}
