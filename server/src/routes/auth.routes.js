import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { User } from "../models/User.js";
import { passwordResetEmail, sendMail, verificationEmail } from "../services/mail.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hashToken, randomToken } from "../utils/crypto.js";
import { clearRefreshCookie, createRefreshToken, setRefreshCookie, signAccessToken } from "../utils/tokens.js";

export const authRouter = Router();

const email = z.string().email().toLowerCase();
const password = z.string().min(8).max(128);

const registerSchema = z.object({
  body: z.object({
    email,
    password,
    displayName: z.string().min(2).max(80)
  })
});

const loginSchema = z.object({
  body: z.object({ email, password })
});

const tokenSchema = z.object({
  body: z.object({ token: z.string().min(32) })
});

const forgotSchema = z.object({
  body: z.object({ email })
});

const resetSchema = z.object({
  body: z.object({
    token: z.string().min(32),
    password
  })
});

const googleSchema = z.object({
  body: z.object({
    idToken: z.string().min(20)
  })
});

function createVerificationToken(user) {
  const token = randomToken();
  user.verificationTokenHash = hashToken(token);
  user.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return token;
}

async function sendVerification(user, token) {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;
  try {
    await sendMail({
      to: user.email,
      subject: "Verify your Theo account",
      html: verificationEmail(verifyUrl)
    });
  } catch (error) {
    console.warn("Verification email could not be sent:", error.message);
  }

  return verifyUrl;
}

async function issueSession(user, res) {
  const accessToken = signAccessToken(user);
  const refresh = createRefreshToken();
  user.refreshTokens = user.refreshTokens
    .filter((entry) => entry.expiresAt > new Date())
    .slice(-9);
  user.refreshTokens.push({
    tokenHash: refresh.tokenHash,
    expiresAt: refresh.expiresAt
  });
  await user.save();
  setRefreshCookie(res, refresh.token);
  return accessToken;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    plan: user.plan,
    role: user.role,
    emailVerified: user.emailVerified,
    customInstructions: user.customInstructions
  };
}

authRouter.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email: userEmail, password: rawPassword, displayName } = req.validated.body;
    const existing = await User.findOne({ email: userEmail });

    if (existing) {
      throw new ApiError(409, "Email is already registered");
    }

    const user = await User.create({
      email: userEmail,
      displayName,
      passwordHash: await bcrypt.hash(rawPassword, 12)
    });
    const verificationToken = createVerificationToken(user);
    await user.save();

    const verifyUrl = await sendVerification(user, verificationToken);

    const accessToken = await issueSession(user, res);
    res.status(201).json({
      user: publicUser(user),
      accessToken,
      devVerificationToken: env.NODE_ENV === "production" ? undefined : verificationToken,
      devVerificationUrl: env.NODE_ENV === "production" ? undefined : verifyUrl
    });
  })
);

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email: userEmail, password: rawPassword } = req.validated.body;
    const user = await User.findOne({ email: userEmail });

    if (!user?.passwordHash || !(await bcrypt.compare(rawPassword, user.passwordHash))) {
      throw new ApiError(401, "Invalid email or password");
    }

    const accessToken = await issueSession(user, res);
    res.json({ user: publicUser(user), accessToken });
  })
);

authRouter.post(
  "/google",
  validate(googleSchema),
  asyncHandler(async (req, res) => {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new ApiError(500, "GOOGLE_CLIENT_ID is not configured");
    }

    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${req.validated.body.idToken}`
    );

    if (!response.ok) {
      throw new ApiError(401, "Invalid Google token");
    }

    const profile = await response.json();
    if (profile.aud !== env.GOOGLE_CLIENT_ID) {
      throw new ApiError(401, "Google token audience mismatch");
    }

    let user = await User.findOne({ email: profile.email.toLowerCase() });
    if (!user) {
      user = await User.create({
        email: profile.email,
        googleId: profile.sub,
        displayName: profile.name || profile.email.split("@")[0],
        avatarUrl: profile.picture,
        emailVerified: profile.email_verified === "true"
      });
    } else {
      user.googleId = profile.sub;
      user.avatarUrl ||= profile.picture;
      user.emailVerified = user.emailVerified || profile.email_verified === "true";
    }

    const accessToken = await issueSession(user, res);
    res.json({ user: publicUser(user), accessToken });
  })
);

authRouter.get("/google-config", (_req, res) => {
  res.json({
    enabled: Boolean(env.GOOGLE_CLIENT_ID),
    clientId: env.GOOGLE_CLIENT_ID
  });
});

authRouter.post(
  "/verify-email",
  validate(tokenSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      verificationTokenHash: hashToken(req.validated.body.token),
      $or: [
        { verificationTokenExpiresAt: { $exists: false } },
        { verificationTokenExpiresAt: null },
        { verificationTokenExpiresAt: { $gt: new Date() } }
      ]
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired verification token");
    }

    user.emailVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    res.json({ user: publicUser(user) });
  })
);

authRouter.post(
  "/resend-verification",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.emailVerified) {
      res.json({ message: "Email is already verified", user: publicUser(req.user) });
      return;
    }

    const token = createVerificationToken(req.user);
    await req.user.save();
    const verifyUrl = await sendVerification(req.user, token);

    res.json({
      message: "Verification link sent",
      devVerificationUrl: env.NODE_ENV === "production" ? undefined : verifyUrl
    });
  })
);

authRouter.post(
  "/forgot-password",
  validate(forgotSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.validated.body.email });
    let devResetToken;

    if (user) {
      const token = randomToken();
      devResetToken = token;
      user.passwordResetTokenHash = hashToken(token);
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      try {
        await sendMail({
          to: user.email,
          subject: "Reset your Theo password",
          html: passwordResetEmail(`${env.CLIENT_URL}/reset-password?token=${token}`)
        });
      } catch (error) {
        console.warn("Password reset email could not be sent:", error.message);
      }
    }

    res.json({
      message: "If the email exists, a reset link has been created",
      devResetUrl:
        env.NODE_ENV === "production" || !devResetToken
          ? undefined
          : `${env.CLIENT_URL}/reset-password?token=${devResetToken}`
    });
  })
);

authRouter.post(
  "/reset-password",
  validate(resetSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      passwordResetTokenHash: hashToken(req.validated.body.token),
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired reset token");
    }

    user.passwordHash = await bcrypt.hash(req.validated.body.password, 12);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.refreshTokens = [];
    await user.save();

    res.json({ message: "Password updated" });
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.theo_refresh;
    if (!refreshToken) {
      throw new ApiError(401, "Refresh token missing");
    }

    const tokenHash = hashToken(refreshToken);
    const user = await User.findOne({ "refreshTokens.tokenHash": tokenHash });
    if (!user) {
      clearRefreshCookie(res);
      throw new ApiError(401, "Invalid refresh token");
    }

    const currentToken = user.refreshTokens.find((entry) => entry.tokenHash === tokenHash);
    if (!currentToken || currentToken.expiresAt <= new Date()) {
      user.refreshTokens = user.refreshTokens.filter(
        (entry) => entry.tokenHash !== tokenHash && entry.expiresAt > new Date()
      );
      await user.save();
      clearRefreshCookie(res);
      throw new ApiError(401, "Refresh session expired");
    }

    user.refreshTokens = user.refreshTokens.filter(
      (entry) => entry.tokenHash !== tokenHash && entry.expiresAt > new Date()
    );

    const accessToken = await issueSession(user, res);
    res.json({ user: publicUser(user), accessToken });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.theo_refresh;
    if (refreshToken) {
      await User.updateOne(
        { "refreshTokens.tokenHash": hashToken(refreshToken) },
        { $pull: { refreshTokens: { tokenHash: hashToken(refreshToken) } } }
      );
    }

    clearRefreshCookie(res);
    res.json({ message: "Logged out" });
  })
);

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export { publicUser };
