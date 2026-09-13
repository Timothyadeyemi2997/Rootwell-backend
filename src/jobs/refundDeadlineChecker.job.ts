import { prisma } from "../config/prisma";
import { sendRefundDecisionPrompt } from "../services/mailService";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export async function checkRefundDeadlines() {
  const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS_MS);

  const staleCancellations = await prisma.booking.findMany({
    where: {
      status: "CANCELLED",
      cancelledAt: { lte: cutoff },
      refundRequest: null, // hasn't already been flagged
    },
    include: {
      coach: { include: { user: true } },
      order: true,
    },
  });

  for (const booking of staleCancellations) {
    if (!booking.cancelledAt || !booking.order) {
      // shouldn't happen for a properly cancelled+paid booking, but guards against bad data
      continue;
    }

    const decisionDeadline = new Date(booking.cancelledAt.getTime() + FORTY_EIGHT_HOURS_MS);

    await prisma.refundRequest.create({
      data: {
        bookingId: booking.id,
        orderId: booking.order.id,
        cancelledAt: booking.cancelledAt,
        decisionDeadline,
        status: "PENDING_DECISION",
      },
    });

    await prisma.bookingLog.create({
      data: {
        bookingId: booking.id,
        action: "REFUND_PROMPTED",
        performedByRole: "ADMIN", // system-triggered, not a specific user
      },
    });

    await sendRefundDecisionPrompt({
      to: booking.coach.user.email,
      coachName: booking.coach.user.name,
    });
  }

  if (staleCancellations.length > 0) {
    console.log(`refundDeadlineChecker: processed ${staleCancellations.length} stale cancellation(s)`);
  }
}