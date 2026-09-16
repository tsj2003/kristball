import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { config, AuthTokenPayload } from "../config/env";
import { HttpError } from "../lib/http";

export function authenticateToken(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "Missing bearer token"));
  }

  try {
    const decoded = jwt.verify(header.slice(7), config.jwtSecret) as AuthTokenPayload;
    if (!decoded?.userId || !decoded?.role) {
      throw new Error("incomplete token");
    }
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      baseId: decoded.baseId ?? null,
    };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export function authorizeRoles(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HttpError(401, "Authentication required"));
    }
    if (!allowed.includes(req.user.role)) {
      return next(new HttpError(403, "You do not have permission for this action"));
    }
    next();
  };
}

/**
 * Base commanders and logistics officers are locked to the base on their token.
 * Client-supplied baseId is ignored for those roles so a commander cannot pivot
 * into another installation by editing a query string or request body.
 */
export function enforceBaseScope(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new HttpError(401, "Authentication required"));
  }

  if (req.user.role === "ADMIN") {
    const requested = typeof req.query.baseId === "string" ? req.query.baseId : undefined;
    req.scopedBaseId = requested || null;
    return next();
  }

  if (!req.user.baseId) {
    return next(new HttpError(403, "Account is not assigned to a base"));
  }

  req.query.baseId = req.user.baseId;
  req.scopedBaseId = req.user.baseId;

  if (req.body && typeof req.body === "object") {
    if ("baseId" in req.body) {
      req.body.baseId = req.user.baseId;
    }
    if ("fromBaseId" in req.body) {
      req.body.fromBaseId = req.user.baseId;
    }
  }

  next();
}
