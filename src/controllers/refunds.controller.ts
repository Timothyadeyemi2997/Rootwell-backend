import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { decideRefund } from "../services/refundService";

const decisionSchema = z.object({
  decision: z.enum(["APPROVE", "DENY"]),
});

export async function patchRefundDecision(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw new Error("Refund request ID is required");
    }

    const coachId = req.coachId!;
    const { decision } = decisionSchema.parse(req.body);

    const refundRequest = await decideRefund({ refundRequestId: id, coachId, decision });

    res.status(200).json({ status: "ok", data: refundRequest });
  } catch (err) {
    next(err);
  }
}