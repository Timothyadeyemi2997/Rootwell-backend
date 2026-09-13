import { Request, Response, NextFunction } from "express";
import { listLeads, listRequestLogs, listBookingLogs } from "../services/adminService";

export async function getLeads(_req: Request, res: Response, next: NextFunction) {
  try {
    const leads = await listLeads();
    res.status(200).json({ status: "ok", data: leads });
  } catch (err) {
    next(err);
  }
}

export async function getRequestLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const path = typeof req.query.path === "string" ? req.query.path : undefined;

    const logs = await listRequestLogs({ limit, path });
    res.status(200).json({ status: "ok", data: logs });
  } catch (err) {
    next(err);
  }
}

export async function getBookingLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const bookingId = typeof req.query.bookingId === "string" ? req.query.bookingId : undefined;
    const logs = await listBookingLogs(bookingId);
    res.status(200).json({ status: "ok", data: logs });
  } catch (err) {
    next(err);
  }
}