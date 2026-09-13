import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

const PLATFORM_FEE_RATE = 0.15;
const TAX_RATE = 0.075; // applied to the coach's share, after the platform fee

function calculatePayout(grossAmountCents: number) {
  const platformFeeCents = Math.round(grossAmountCents * PLATFORM_FEE_RATE);
  const coachShareCents = grossAmountCents - platformFeeCents;
  const taxAmountCents = Math.round(coachShareCents * TAX_RATE);
  const netAmountCents = coachShareCents - taxAmountCents;
  return { platformFeeCents, taxAmountCents, netAmountCents };
}

async function maybeFinalizeCompletion(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;

  if (!booking.clientCompletedAt || !booking.coachCompletedAt) {
    return; // still waiting on the other side
  }

  if (booking.status === "COMPLETED") {
    return; // already finalized — guards against a race between the two confirmations
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
  });

  await prisma.bookingLog.create({
    data: {
      bookingId,
      action: "COMPLETED",
      performedByRole: "ADMIN", // system-finalized once both sides confirmed
    },
  });

  const order = booking.orderId
    ? await prisma.order.findUnique({ where: { id: booking.orderId } })
    : null;

  if (order) {
    const { platformFeeCents, taxAmountCents, netAmountCents } = calculatePayout(order.amountCents);

    await prisma.payout.create({
      data: {
        bookingId,
        coachId: booking.coachId,
        grossAmountCents: order.amountCents,
        platformFeeCents,
        taxAmountCents,
        netAmountCents,
        status: "RELEASED",
        releasedAt: new Date(),
      },
    });
  }
}

export async function markCompletedByClient(bookingId: string, clientId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.clientId !== clientId) throw ApiError.forbidden("This is not your booking");
  if (booking.status !== "CONFIRMED") throw ApiError.badRequest("Only confirmed bookings can be marked complete");

  await prisma.booking.update({
    where: { id: bookingId },
    data: { clientCompletedAt: new Date() },
  });

  await maybeFinalizeCompletion(bookingId);

  return prisma.booking.findUnique({ where: { id: bookingId } });
}

export async function markCompletedByCoach(bookingId: string, coachId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.coachId !== coachId) throw ApiError.forbidden("You are not assigned to this booking");
  if (booking.status !== "CONFIRMED") throw ApiError.badRequest("Only confirmed bookings can be marked complete");

  await prisma.booking.update({
    where: { id: bookingId },
    data: { coachCompletedAt: new Date() },
  });

  await maybeFinalizeCompletion(bookingId);

  return prisma.booking.findUnique({ where: { id: bookingId } });
}