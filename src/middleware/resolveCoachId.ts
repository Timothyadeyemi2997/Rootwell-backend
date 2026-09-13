import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export async function resolveCoachId(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.authUser) {
      return next(ApiError.unauthorized("You must be logged in"));
    }

    const coach = await prisma.coach.findUnique({
      where: { userId: req.authUser.userId },
      select: { id: true },
    });

    if (!coach) {
      return next(ApiError.forbidden("No coach profile found for this account"));
    }

    req.coachId = coach.id;
    next();
  } catch (err) {
    next(err);
  }
}