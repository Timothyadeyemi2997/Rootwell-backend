import { Request, Response, NextFunction } from "express";
import { getClientOverview, getClientBookings } from "../services/portalService";

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const overview = await getClientOverview(userId);
    res.status(200).json({ status: "ok", data: overview });
  } catch (err) {
    next(err);
  }
}

export async function getMyBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const bookings = await getClientBookings(userId);
    res.status(200).json({ status: "ok", data: bookings });
  } catch (err) {
    next(err);
  }
}