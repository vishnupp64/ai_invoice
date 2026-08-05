import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";
import { verifyAccessToken } from "../utils/jwt";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return next(new HttpError(401, "Missing Authorization header"));

  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) return next(new HttpError(401, "Invalid Authorization header"));

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

