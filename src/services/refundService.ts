import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { sendRefundApproved, sendRefundDenied } from "./mailService";

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

interface DecideRefundInput {
  refundRequestId: string;
  coachId: string;
  decision: "APPROVE" | "DENY";
}

export async function decideRefund(input: DecideRefundInput) {
  const { refundRequestId, coachId, decision } = input;

  const refundRequest = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    include: {
      booking: { include: { coach: true, client: true } },
    },
  });

  if (!refundRequest) throw ApiError.notFound("Refund request not found");
  if (refundRequest.booking.coachId !== coachId) {
    throw ApiError.forbidden("You are not assigned to this booking");
  }
  if (refundRequest.status !== "PENDING_DECISION") {
    throw ApiError.badRequest("This refund request has already been decided");
  }

  const now = new Date();
  const scheduledRefundAt = decision === "APPROVE" ? new Date(now.getTime() + SEVENTY_TWO_HOURS_MS) : null;

  const updated = await prisma.refundRequest.update({
    where: { id: refundRequestId },
    data: {
      status: decision === "APPROVE" ? "APPROVED" : "DENIED",
      coachDecision: decision,
      decidedAt: now,
      scheduledRefundAt,
    },
  });

  await prisma.bookingLog.create({
    data: {
      bookingId: refundRequest.bookingId,
      action: decision === "APPROVE" ? "REFUND_APPROVED" : "REFUND_DENIED",
      performedById: coachId,
      performedByRole: "COACH",
    },
  });

  const client = refundRequest.booking.client;
  if (decision === "APPROVE") {
    await sendRefundApproved({ to: client.email, clientName: client.name });
  } else {
    await sendRefundDenied({ to: client.email, clientName: client.name });
  }

  return updated;
}