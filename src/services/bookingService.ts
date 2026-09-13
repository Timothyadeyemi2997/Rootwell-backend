import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import {
  findAvailableCoach,
  suggestAlternativeCoaches,
  assertCoachCanTakeBooking,
} from "./schedulingService";
import { createCallRoom } from "./videoCallService";
import {
  sendBookingApprovalRequest,
  sendBookingPendingApproval,
  sendBookingConfirmation,
  sendBookingRescheduled,
  sendBookingCancelled,
  sendBookingTransferred,
} from "./mailService";

const DEFAULT_SESSION_LENGTH_MS = 60 * 60 * 1000; // fallback, used only by reschedule
const JOIN_WINDOW_BEFORE_MS = 5 * 60 * 1000; // can join 5 min before scheduled start

interface CreateBookingInput {
  clientId: string;
  specialty: string;
  reason: string;
  scheduledAt: Date;
  orderId: string;
  preferredCoachId?: string;
}

export async function createBooking(input: CreateBookingInput) {
  const { clientId, specialty, reason, scheduledAt, orderId, preferredCoachId } = input;

  const coach = preferredCoachId
    ? await assertCoachCanTakeBooking(preferredCoachId, scheduledAt)
    : await findAvailableCoach(specialty, scheduledAt);

  if (!coach) {
    const suggestions = await suggestAlternativeCoaches(specialty, preferredCoachId);
    throw ApiError.conflict(
      suggestions.length > 0
        ? "No coach available at that time. See suggestions."
        : "No coach available for this specialty right now."
    );
  }

  const booking = await prisma.booking.create({
    data: {
      clientId,
      coachId: coach.id,
      orderId,
      reason,
      scheduledAt, // the client's requested time — not yet confirmed
      status: "PENDING",
    },
  });

  await prisma.bookingLog.create({
    data: {
      bookingId: booking.id,
      action: "CREATED",
      performedById: clientId,
      performedByRole: "CLIENT",
    },
  });

  const [client, coachUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientId } }),
    prisma.user.findUnique({ where: { id: coach.userId } }),
  ]);

  if (client && coachUser) {
    await sendBookingApprovalRequest({
      to: coachUser.email,
      coachName: coachUser.name,
      clientName: client.name,
      clientEmail: client.email,
      reason,
      scheduledAt,
      bookingId: booking.id,
    });

    await sendBookingPendingApproval({
      to: client.email,
      clientName: client.name,
      coachName: coachUser.name,
    });
  }

  return booking;
}

interface ApproveBookingInput {
  bookingId: string;
  coachId: string;
  scheduledAt: Date;
  scheduledEndAt: Date;
}

export async function approveBooking(input: ApproveBookingInput) {
  const { bookingId, coachId, scheduledAt, scheduledEndAt } = input;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.coachId !== coachId) throw ApiError.forbidden("You are not assigned to this booking");
  if (booking.status !== "PENDING") throw ApiError.badRequest("This booking is no longer awaiting approval");

  if (scheduledEndAt <= scheduledAt) {
    throw ApiError.badRequest("End time must be after start time");
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED", scheduledAt, scheduledEndAt },
  });

  await prisma.bookingLog.create({
    data: {
      bookingId,
      action: "CONFIRMED",
      performedById: coachId,
      performedByRole: "COACH",
      metadata: { scheduledAt, scheduledEndAt },
    },
  });

  await createCallRoom(bookingId);

  const [client, coach, order] = await Promise.all([
    prisma.user.findUnique({ where: { id: booking.clientId } }),
    prisma.coach.findUnique({ where: { id: coachId }, include: { user: true } }),
    booking.orderId ? prisma.order.findUnique({ where: { id: booking.orderId } }) : null,
  ]);

  if (client && coach && order) {
    await sendBookingConfirmation({
      to: client.email,
      clientName: client.name,
      coachName: coach.user.name,
      coachBio: coach.bio,
      reason: booking.reason,
      scheduledAt,
      amountCents: order.amountCents,
      transactionId: order.stripeSessionId,
    });
  }

  return updated;
}

export async function declineBooking(bookingId: string, coachId: string, reason: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.coachId !== coachId) throw ApiError.forbidden("You are not assigned to this booking");
  if (booking.status !== "PENDING") throw ApiError.badRequest("This booking is no longer awaiting approval");

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelledById: coachId,
      cancelledByRole: "COACH",
      cancellationReason: reason,
      cancelledAt: new Date(),
    },
  });

  await prisma.bookingLog.create({
    data: { bookingId, action: "CANCELLED", performedById: coachId, performedByRole: "COACH", reason },
  });

  const client = await prisma.user.findUnique({ where: { id: booking.clientId } });
  if (client) {
    await sendBookingCancelled({ to: client.email, clientName: client.name, cancellationReason: reason });
  }

  return updated;
}

interface RescheduleInput {
  bookingId: string;
  coachId: string;
  newScheduledAt: Date;
}

export async function rescheduleBooking(input: RescheduleInput) {
  const { bookingId, coachId, newScheduledAt } = input;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.coachId !== coachId) throw ApiError.forbidden("You are not assigned to this booking");
  if (booking.status !== "CONFIRMED") throw ApiError.badRequest("Only confirmed bookings can be rescheduled");

  await assertCoachCanTakeBooking(coachId, newScheduledAt);

  const previousTime = booking.scheduledAt;
  const newScheduledEndAt = new Date(newScheduledAt.getTime() + DEFAULT_SESSION_LENGTH_MS);

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { scheduledAt: newScheduledAt, scheduledEndAt: newScheduledEndAt },
  });

  await prisma.bookingLog.create({
    data: {
      bookingId,
      action: "RESCHEDULED",
      performedById: coachId,
      performedByRole: "COACH",
      metadata: { previousTime, newTime: newScheduledAt },
    },
  });

  const client = await prisma.user.findUnique({ where: { id: booking.clientId } });
  if (client) {
    await sendBookingRescheduled({
      to: client.email,
      clientName: client.name,
      previousTime,
      newTime: newScheduledAt,
    });
  }

  return updated;
}

interface CancelInput {
  bookingId: string;
  coachId: string;
  cancellationReason: string;
}

export async function cancelBooking(input: CancelInput) {
  const { bookingId, coachId, cancellationReason } = input;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.coachId !== coachId) throw ApiError.forbidden("You are not assigned to this booking");
  if (booking.status !== "CONFIRMED") throw ApiError.badRequest("Only confirmed bookings can be cancelled");

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelledById: coachId,
      cancelledByRole: "COACH",
      cancellationReason,
      cancelledAt: new Date(),
    },
  });

  await prisma.bookingLog.create({
    data: {
      bookingId,
      action: "CANCELLED",
      performedById: coachId,
      performedByRole: "COACH",
      reason: cancellationReason,
    },
  });

  const client = await prisma.user.findUnique({ where: { id: booking.clientId } });
  if (client) {
    await sendBookingCancelled({
      to: client.email,
      clientName: client.name,
      cancellationReason,
    });
  }

  return updated;
}

interface TransferInput {
  bookingId: string;
  fromCoachId: string;
  toCoachId: string;
  reason: string;
}

const MIN_TRANSFER_EARNINGS_CENTS = 10_000; // $100.00

async function hasReachedTransferThreshold(coachId: string): Promise<boolean> {
  const result = await prisma.payout.aggregate({
    where: { coachId, status: { in: ["RELEASED", "WITHDRAWN"] } },
    _sum: { netAmountCents: true },
  });
  return (result._sum.netAmountCents ?? 0) >= MIN_TRANSFER_EARNINGS_CENTS;
}

export async function transferBooking(input: TransferInput) {
  const { bookingId, fromCoachId, toCoachId, reason } = input;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.coachId !== fromCoachId) throw ApiError.forbidden("You are not assigned to this booking");
  if (booking.status !== "CONFIRMED") throw ApiError.badRequest("Only confirmed bookings can be transferred");

  const eligible = await hasReachedTransferThreshold(fromCoachId);
  if (!eligible) {
    throw ApiError.forbidden(
      "Transfer is unavailable until you reach the minimum earnings threshold. Consider cancelling instead."
    );
  }

  await assertCoachCanTakeBooking(toCoachId, booking.scheduledAt);

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { coachId: toCoachId },
  });

  await prisma.bookingLog.create({
    data: {
      bookingId,
      action: "TRANSFERRED",
      performedById: fromCoachId,
      performedByRole: "COACH",
      reason,
      metadata: { fromCoachId, toCoachId },
    },
  });

  const [client, newCoach] = await Promise.all([
    prisma.user.findUnique({ where: { id: booking.clientId } }),
    prisma.coach.findUnique({ where: { id: toCoachId }, include: { user: true } }),
  ]);

  if (client && newCoach) {
    await sendBookingTransferred({
      to: client.email,
      clientName: client.name,
      newCoachName: newCoach.user.name,
    });
  }

  return updated;
}

export async function getBookingCallAccess(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.status !== "CONFIRMED" || !booking.scheduledEndAt) {
    throw ApiError.forbidden("This session has not been confirmed");
  }

  const coach = await prisma.coach.findUnique({ where: { id: booking.coachId } });
  if (booking.clientId !== userId && coach?.userId !== userId) {
    throw ApiError.forbidden("You are not part of this session");
  }

  const now = Date.now();
  const startMs = booking.scheduledAt.getTime();
  const endMs = booking.scheduledEndAt.getTime();
  const joinWindowStart = startMs - JOIN_WINDOW_BEFORE_MS;

  if (now < joinWindowStart) throw ApiError.forbidden("This session hasn't started yet");
  if (now > endMs) throw ApiError.forbidden("This session's call window has ended");

  return {
    callRoomUrl: booking.callRoomUrl,
    scheduledAt: booking.scheduledAt,
    endsAt: booking.scheduledEndAt,
  };
}

export async function listCoachBookings(coachId: string) {
  return prisma.booking.findMany({
    where: { coachId },
    include: { client: { select: { name: true, email: true } } },
    orderBy: { scheduledAt: "desc" },
  });
}