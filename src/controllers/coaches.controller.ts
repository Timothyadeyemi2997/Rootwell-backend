import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { listCoaches, getCoachById, uploadCoachProfileImage } from "../services/coachServices";
import { getAvailableSlots } from "../services/schedulingService";

export async function getCoaches(_req: Request, res: Response, next: NextFunction) {
  try {
    const coaches = await listCoaches();
    res.status(200).json({ status: "ok", data: coaches });
  } catch (err) {
    next(err);
  }
}

export async function getCoach(req: Request, res: Response, next: NextFunction) {
  try {
    const coachId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const coach = await getCoachById(coachId);
    if (!coach) {
      throw ApiError.notFound("Coach not found");
    }
    res.status(200).json({ status: "ok", data: coach });
  } catch (err) {
    next(err);
  }
}

export async function getSlots(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const from = req.query.from ? new Date(req.query.from as string) : new Date();
    const to = req.query.to ? new Date(req.query.to as string) : new Date(Date.now() + 14 * 86400000);
    const slots = await getAvailableSlots(id as string, from, to);
    res.status(200).json({ status: "ok", data: slots });
  } catch (err) {
    next(err);
  }
}

// coaches.controller.ts
export async function postProfileImage(req: Request, res: Response, next: NextFunction) {
  try {
    const coachId = req.coachId!;
    if (!req.file) throw ApiError.badRequest("An image file is required");
    const url = await uploadCoachProfileImage(coachId, req.file.buffer);
    res.status(200).json({ status: "ok", data: { profileImageUrl: url } });
  } catch (err) {
    next(err);
  }
}