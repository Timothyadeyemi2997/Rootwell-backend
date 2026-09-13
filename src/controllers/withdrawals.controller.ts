import { Request, Response, NextFunction } from "express";
import { getAvailableBalance, requestWithdrawal } from "../services/withdrawalService";

export async function getBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const coachId = req.coachId!;
    const balanceCents = await getAvailableBalance(coachId);
    res.status(200).json({ status: "ok", data: { balanceCents } });
  } catch (err) {
    next(err);
  }
}

export async function postWithdrawal(req: Request, res: Response, next: NextFunction) {
  try {
    const coachId = req.coachId!;
    const result = await requestWithdrawal(coachId);
    res.status(200).json({ status: "ok", data: result });
  } catch (err) {
    next(err);
  }
}