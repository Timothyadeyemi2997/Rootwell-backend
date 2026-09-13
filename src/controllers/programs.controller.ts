import { Request, Response, NextFunction } from "express";
import { listPrograms } from "../services/programService";

export async function getPrograms(_req: Request, res: Response, next: NextFunction) {
  try {
    const programs = await listPrograms();
    res.status(200).json({ status: "ok", data: programs });
  } catch (err) {
    next(err);
  }
}