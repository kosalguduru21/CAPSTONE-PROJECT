import crypto from "crypto";
import { SessionModel } from "../models/session.model.js";
import { UserModel } from "../models/user.model.js";

/**
 * Extracts session identifier from HttpOnly cookie or Authorization header.
 */
export async function authenticateSession(req, res, next) {
  try {
    const sessionId =
      req.cookies?.sessionId ||
      req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
      req.headers["x-session-id"];

    if (!sessionId) {
      const error = new Error("Authentication required. Please sign in.");
      error.statusCode = 401;
      throw error;
    }

    const session = await SessionModel.findOne({ sessionId });
    if (!session) {
      const error = new Error("Invalid or expired session. Please sign in again.");
      error.statusCode = 401;
      throw error;
    }

    if (new Date() > new Date(session.expiresAt)) {
      await SessionModel.deleteOne({ _id: session._id });
      const error = new Error("Session has expired. Please sign in again.");
      error.statusCode = 401;
      throw error;
    }

    const user = await UserModel.findById(session.userId);
    if (!user || user.accountStatus !== "active") {
      const error = new Error("Account is inactive or not found.");
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Protect against Cross-Site Request Forgery on state-changing requests.
 */
export function verifyCsrf(req, res, next) {
  // Safe methods do not require CSRF token
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // If request uses Bearer token authorization header directly (e.g. API clients, testing), skip CSRF check
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return next();
  }

  const clientCsrf = req.headers["x-csrf-token"] || req.body?._csrf;
  const serverCsrf = req.session?.csrfToken;

  if (!clientCsrf || !serverCsrf || clientCsrf !== serverCsrf) {
    const error = new Error("Invalid or missing CSRF token");
    error.statusCode = 403;
    return next(error);
  }

  next();
}

/**
 * Generate a cryptographically secure random session token.
 */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}
