import { Request, Response, NextFunction } from "express";
import { createOnboardingLink } from "../services/connectService";

export async function postOnboardingLink(req: Request, res: Response, next: NextFunction) {
  try {
    const coachId = req.coachId!;
    const url = await createOnboardingLink(coachId);
    res.status(200).json({ status: "ok", data: { onboardingUrl: url } });
  } catch (err) {
    next(err);
  }
}