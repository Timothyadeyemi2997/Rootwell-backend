import { prisma } from "../config/prisma";
import { stripe } from "../config/stripe";
import { sendRefundCompleted } from "../services/mailService";

export async function processScheduledRefunds() {
  const now = new Date();

  const dueRefunds = await prisma.refundRequest.findMany({
    where: {
      status: "APPROVED",
      scheduledRefundAt: { lte: now },
    },
    include: {
      order: true,
      booking: { include: { client: true } },
    },
  });

  for (const refundRequest of dueRefunds) {
    try {
      if (!refundRequest.order.stripePaymentIntentId) {
        console.error(
          `RefundRequest ${refundRequest.id} has no stripePaymentIntentId — cannot process refund`
        );
        continue;
      }

      const refund = await stripe.refunds.create({
        payment_intent: refundRequest.order.stripePaymentIntentId,
      });

      await prisma.refundRequest.update({
        where: { id: refundRequest.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          stripeRefundId: refund.id,
        },
      });

      await prisma.order.update({
        where: { id: refundRequest.orderId },
        data: { status: "REFUNDED" },
      });

      await prisma.bookingLog.create({
        data: {
          bookingId: refundRequest.bookingId,
          action: "REFUND_COMPLETED",
          performedByRole: "ADMIN",
        },
      });

      const client = refundRequest.booking.client;
      await sendRefundCompleted({ to: client.email, clientName: client.name });
    } catch (err) {
      console.error(`Failed to process refund for RefundRequest ${refundRequest.id}:`, err);
      await prisma.refundRequest.update({
        where: { id: refundRequest.id },
        data: { status: "FAILED" },
      });
    }
  }

  if (dueRefunds.length > 0) {
    console.log(`refundProcessor: processed ${dueRefunds.length} refund(s)`);
  }
}