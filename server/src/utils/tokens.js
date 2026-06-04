import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { hashToken, randomToken } from "./crypto.js";

const accessTtl = "15m";
const refreshDays = 30;
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  path: "/"
};

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, plan: user.plan },
    env.JWT_ACCESS_SECRET,
    { expiresIn: accessTtl }
  );
}

export function createRefreshToken() {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);
  return { token, tokenHash: hashToken(token), expiresAt };
}

export function setRefreshCookie(res, token) {
  res.cookie("theo_refresh", token, {
    ...refreshCookieOptions,
    maxAge: refreshDays * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie("theo_refresh", refreshCookieOptions);
}
