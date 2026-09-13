import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { JwtPayload } from "../types/jwt";

export function requireRole(...allowedRoles: JwtPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.authUser;

    if (!user) {
      return next(ApiError.unauthorized("You must be logged in"));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(ApiError.forbidden("You do not have permission to do this"));
    }

    next();
  };
}