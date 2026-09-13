import { Request, Response, NextFunction } from "express";
import { getOrderBySessionId } from "../services/orderService";

export async function getOrderBySession(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params;
    if (typeof sessionId !== "string") {
      throw new Error("Session ID is required");
    }
    const userId = req.authUser!.userId;
    const order = await getOrderBySessionId(sessionId, userId);
    res.status(200).json({ status: "ok", data: order });
  } catch (err) {
    next(err);
  }
}