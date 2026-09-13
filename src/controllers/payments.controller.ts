import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createCheckoutSession } from "../services/stripeService";

const checkoutSchema = z.object({ programId: z.string() });

export async function postCheckoutSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { programId } = checkoutSchema.parse(req.body);

    const session = await createCheckoutSession({ userId, programId });

    res.status(200).json({ status: "ok", data: { checkoutUrl: session.url } });
  } catch (err) {
    next(err);
  }
}