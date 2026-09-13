import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { captureLead } from "../services/leadService";

const leadSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
});

export async function createLead(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, source } = leadSchema.parse(req.body);
    await captureLead(email, source);
    res.status(201).json({ status: "ok", message: "Lead captured" });
  } catch (err) {
    next(err);
  }
}