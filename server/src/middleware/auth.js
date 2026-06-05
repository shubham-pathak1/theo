import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, "Please sign in to continue", { code: "AUTH_REQUIRED" });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (error) {
    const expired = error.name === "TokenExpiredError";
    throw new ApiError(
      401,
      expired ? "Your session expired. Please sign in again." : "Your session token is invalid. Please sign in again.",
      { code: expired ? "ACCESS_TOKEN_EXPIRED" : "ACCESS_TOKEN_INVALID" }
    );
  }

  const user = await User.findById(payload.sub).select("-passwordHash -refreshTokens");
  if (!user) {
    throw new ApiError(401, "This account no longer exists", { code: "USER_NOT_FOUND" });
  }

  req.user = user;
  next();
});

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== "admin") {
    next(new ApiError(403, "Admin access required"));
    return;
  }

  next();
}
