import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken;

  if (!token) {
    return next(ApiError.unauthorized("You must be logged in"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.authUser = payload;
    next();
  } catch (err) {
    return next(ApiError.unauthorized("Session expired or invalid"));
  }
}