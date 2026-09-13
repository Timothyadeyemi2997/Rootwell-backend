import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    prisma.requestLog
      .create({
        data: {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          userId: req.authUser?.userId ?? null,
          ip: req.ip ?? null,
        },
      })
      .catch((err) => {
        console.error("Failed to write request log:", err);
      });
  });
  next();
}