import { Types } from "mongoose";

/**
 * Ensures authenticated user has one of the required roles.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      return next(error);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error(
        `Forbidden: Role '${req.user.role}' is not authorized to perform this action.`,
      );
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
}

/**
 * Validates that property managers can only operate on properties in their authorized scope.
 */
export function enforcePropertyScope(req, res, next) {
  const { propertyId } = req.params.propertyId
    ? req.params
    : req.body.propertyId
      ? req.body
      : req.query;

  if (!propertyId) {
    return next();
  }

  if (req.user.role === "admin") {
    return next();
  }

  if (req.user.role === "property_manager") {
    const isAuthorized = req.user.propertyScope?.some(
      (pId) => pId.toString() === propertyId.toString(),
    );
    if (!isAuthorized) {
      const error = new Error(
        "Forbidden: You do not have management authority over this property.",
      );
      error.statusCode = 403;
      return next(error);
    }
  }

  if (req.user.role === "resident") {
    if (
      req.user.residentPropertyId &&
      req.user.residentPropertyId.toString() !== propertyId.toString()
    ) {
      const error = new Error(
        "Forbidden: You cannot access resources for a different property.",
      );
      error.statusCode = 403;
      return next(error);
    }
  }

  next();
}
