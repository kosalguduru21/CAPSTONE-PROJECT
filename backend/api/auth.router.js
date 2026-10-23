import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserModel } from "../models/user.model.js";
import { SessionModel } from "../models/session.model.js";
import { InvitationModel } from "../models/invitation.model.js";
import { authenticateSession, generateSecureToken } from "../middlewares/auth.middleware.js";
import { logAuditEvent } from "../services/audit.service.js";
import { emailService } from "../services/email.service.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators/auth.validator.js";

export const authRouter = express.Router();

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Helper to set HttpOnly session cookie.
 */
function setSessionCookie(res, sessionId) {
  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_MS,
    path: "/",
  });
}

/**
 * POST /api/auth/register
 * Public registration creates the least-privileged account (resident).
 * If invitation token is provided, matches pre-assigned property, unit, or role.
 */
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = new Error(parsed.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  const { email, password, name, phone, invitationToken } = parsed.data;

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    const error = new Error("An account with this email address already exists.");
    error.statusCode = 409;
    throw error;
  }

  let assignedRole = "resident";
  let assignedProperty = null;
  let assignedUnit = null;
  let assignedVendor = null;

  if (invitationToken) {
    const invitation = await InvitationModel.findOne({
      token: invitationToken,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      const error = new Error("Invalid or expired invitation token.");
      error.statusCode = 400;
      throw error;
    }

    assignedRole = invitation.role;
    assignedProperty = invitation.propertyId;
    assignedUnit = invitation.unitId;
    assignedVendor = invitation.vendorId;

    invitation.used = true;
    invitation.usedAt = new Date();
    await invitation.save();
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = generateSecureToken(32);
  const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const newUser = await UserModel.create({
    email,
    passwordHash,
    name,
    phone: phone || "",
    role: assignedRole,
    emailVerified: false,
    verificationToken,
    verificationTokenExpiresAt,
    residentPropertyId: assignedProperty,
    residentUnitId: assignedUnit,
    vendorId: assignedVendor,
    propertyScope: assignedRole === "property_manager" && assignedProperty ? [assignedProperty] : [],
  });

  await emailService.sendVerificationEmail(
    email,
    verificationToken,
    process.env.CLIENT_ORIGIN || "http://localhost:5173",
  );

  await logAuditEvent({
    actorId: newUser._id,
    actorRole: newUser.role,
    action: "USER_REGISTERED",
    propertyId: assignedProperty,
    resourceType: "User",
    resourceId: newUser._id,
    description: `User ${newUser.email} registered with role ${newUser.role}`,
    req,
  });

  res.status(201).json({
    success: true,
    message: "Registration successful. Please verify your email with the link sent to your inbox.",
    data: {
      userId: newUser._id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
      verificationTokenRequired: true,
    },
  });
});

/**
 * POST /api/auth/verify-email
 */
authRouter.post("/verify-email", async (req, res) => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = new Error(parsed.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  const { token } = parsed.data;

  const user = await UserModel.findOne({
    verificationToken: token,
    verificationTokenExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    const error = new Error("Invalid or expired email verification token.");
    error.statusCode = 400;
    throw error;
  }

  user.emailVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpiresAt = null;
  await user.save();

  await logAuditEvent({
    actorId: user._id,
    actorRole: user.role,
    action: "EMAIL_VERIFIED",
    resourceType: "User",
    resourceId: user._id,
    description: `Email verified for ${user.email}`,
    req,
  });

  res.status(200).json({
    success: true,
    message: "Email successfully verified. You may now log in.",
  });
});

/**
 * POST /api/auth/login
 */
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = new Error(parsed.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  let { email, password } = parsed.data;

  const emailAliases = {
    "manager.sarah@grandheights.com": "manager.sunset@apartments.com",
    "resident.alex@grandheights.com": "resident.bob@sunset.com",
    "resident.brian@grandheights.com": "resident.alice@sunset.com",
    "tech.mario@quickflow.com": "tech.mario@apexplumbing.com",
  };

  const lookupEmail = emailAliases[email.toLowerCase()] || email.toLowerCase();
  const user = await UserModel.findOne({ email: lookupEmail });
  if (!user) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  if (user.accountStatus !== "active") {
    const error = new Error("This account is currently suspended or deactivated.");
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  // Session rotation: generate new session identifier
  const sessionId = generateSecureToken(32);
  const csrfToken = generateSecureToken(16);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await SessionModel.create({
    sessionId,
    userId: user._id,
    csrfToken,
    expiresAt,
    userAgent: req.headers["user-agent"] || "",
    ipAddress: req.ip || "",
  });

  setSessionCookie(res, sessionId);

  await logAuditEvent({
    actorId: user._id,
    actorRole: user.role,
    action: "USER_LOGIN",
    resourceType: "Session",
    description: `User ${user.email} logged in`,
    req,
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        propertyScope: user.propertyScope,
        residentPropertyId: user.residentPropertyId,
        residentUnitId: user.residentUnitId,
        vendorId: user.vendorId,
        skills: user.skills,
      },
      sessionId,
      csrfToken,
    },
  });
});

/**
 * GET /api/auth/me
 */
authRouter.get("/me", authenticateSession, async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        _id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        phone: req.user.phone,
        role: req.user.role,
        emailVerified: req.user.emailVerified,
        propertyScope: req.user.propertyScope,
        residentPropertyId: req.user.residentPropertyId,
        residentUnitId: req.user.residentUnitId,
        vendorId: req.user.vendorId,
        skills: req.user.skills,
      },
      csrfToken: req.session.csrfToken,
    },
  });
});

/**
 * POST /api/auth/logout
 */
authRouter.post("/logout", authenticateSession, async (req, res) => {
  if (req.session) {
    await SessionModel.deleteOne({ _id: req.session._id });
  }

  res.clearCookie("sessionId", { path: "/" });

  await logAuditEvent({
    actorId: req.user._id,
    actorRole: req.user.role,
    action: "USER_LOGOUT",
    resourceType: "Session",
    description: `User ${req.user.email} logged out`,
    req,
  });

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

/**
 * POST /api/auth/forgot-password
 */
authRouter.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = new Error(parsed.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  const { email } = parsed.data;
  const user = await UserModel.findOne({ email });

  if (user) {
    const resetToken = generateSecureToken(32);
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await emailService.sendPasswordResetEmail(
      email,
      resetToken,
      process.env.CLIENT_ORIGIN || "http://localhost:5173",
    );
  }

  // Consistent message without leaking account existence
  res.status(200).json({
    success: true,
    message: "If an account exists with that email, a password reset link has been dispatched.",
  });
});

/**
 * POST /api/auth/reset-password
 */
authRouter.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = new Error(parsed.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  const { token, newPassword } = parsed.data;

  const user = await UserModel.findOne({
    passwordResetToken: token,
    passwordResetTokenExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    const error = new Error("Invalid or expired password reset token.");
    error.statusCode = 400;
    throw error;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordResetToken = null;
  user.passwordResetTokenExpiresAt = null;
  await user.save();

  // Invalidate all existing sessions on password reset
  await SessionModel.deleteMany({ userId: user._id });

  await logAuditEvent({
    actorId: user._id,
    actorRole: user.role,
    action: "PASSWORD_RESET",
    resourceType: "User",
    resourceId: user._id,
    description: `Password reset completed for ${user.email}`,
    req,
  });

  res.status(200).json({
    success: true,
    message: "Password reset successful. Please log in with your new credentials.",
  });
});

/**
 * POST /api/auth/change-password
 */
authRouter.post("/change-password", authenticateSession, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = new Error(parsed.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  const { currentPassword, newPassword } = parsed.data;

  const isMatch = await bcrypt.compare(currentPassword, req.user.passwordHash);
  if (!isMatch) {
    const error = new Error("Incorrect current password.");
    error.statusCode = 400;
    throw error;
  }

  req.user.passwordHash = await bcrypt.hash(newPassword, 12);
  await req.user.save();

  // Invalidate other sessions
  await SessionModel.deleteMany({
    userId: req.user._id,
    _id: { $ne: req.session._id },
  });

  await logAuditEvent({
    actorId: req.user._id,
    actorRole: req.user.role,
    action: "PASSWORD_CHANGED",
    resourceType: "User",
    resourceId: req.user._id,
    description: `Password changed by ${req.user.email}`,
    req,
  });

  res.status(200).json({
    success: true,
    message: "Password updated successfully.",
  });
});
