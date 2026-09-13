import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { suggestAlternativeCoaches } from "../services/schedulingService";
import { ApiError } from "../utils/ApiError";
import {
  createBooking,
  approveBooking,
  declineBooking,
  rescheduleBooking,
  cancelBooking,
  transferBooking,
  getBookingCallAccess,
  listCoachBookings,
} from "../services/bookingService";
import { markCompletedByClient, markCompletedByCoach } from "../services/completionService";
import { createReview } from "../services/reviewService";

const createBookingSchema = z.object({
  specialty: z.string(),
  reason: z.string().min(3),
  scheduledAt: z.string().datetime(),
  orderId: z.string(),
  preferredCoachId: z.string().optional(),
});

export async function postBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = req.authUser!.userId;
    const { specialty, reason, scheduledAt, orderId, preferredCoachId } =
      createBookingSchema.parse(req.body);

    const booking = await createBooking({
      clientId,
      specialty,
      reason,
      scheduledAt: new Date(scheduledAt),
      orderId,
      preferredCoachId,
    });

    res.status(201).json({ status: "ok", data: booking });
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 409) {
      const specialty = req.body.specialty;
      const preferredCoachId = req.body.preferredCoachId;
      const suggestions = await suggestAlternativeCoaches(specialty, preferredCoachId);
      return res.status(409).json({
        status: "error",
        message: err.message,
        suggestions,
      });
    }
    next(err);
  }
}

const declineSchema = z.object({ reason: z.string().min(3) });

export async function patchApprove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") throw ApiError.badRequest("Booking ID is required");
    const coachId = req.coachId!;
    const { scheduledAt, scheduledEndAt } = approveSchema.parse(req.body);
    const booking = await approveBooking({
      bookingId: id,
      coachId,
      scheduledAt: new Date(scheduledAt),
      scheduledEndAt: new Date(scheduledEndAt),
    });
    res.status(200).json({ status: "ok", data: booking });
  } catch (err) {
    next(err);
  }
}

export async function patchDecline(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") throw ApiError.badRequest("Booking ID is required");
    const coachId = req.coachId!;
    const { reason } = declineSchema.parse(req.body);
    const booking = await declineBooking(id, coachId, reason);
    res.status(200).json({ status: "ok", data: booking });
  } catch (err) {
    next(err);
  }
}

const rescheduleSchema = z.object({ newScheduledAt: z.string().datetime() });
const cancelSchema = z.object({ cancellationReason: z.string().min(3) });
const transferSchema = z.object({ toCoachId: z.string(), reason: z.string().min(3) });

export async function patchReschedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw ApiError.badRequest("Booking ID is required");
    }
    const coachId = req.coachId!;
    const { newScheduledAt } = rescheduleSchema.parse(req.body);
    const booking = await rescheduleBooking({
      bookingId: id,
      coachId,
      newScheduledAt: new Date(newScheduledAt),
    });
    res.status(200).json({ status: "ok", data: booking });
  } catch (err) {
    next(err);
  }
}

export async function patchCancel(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw ApiError.badRequest("Booking ID is required");
    }
    const coachId = req.coachId!;
    const { cancellationReason } = cancelSchema.parse(req.body);
    const booking = await cancelBooking({
      bookingId: id,
      coachId,
      cancellationReason,
    });
    res.status(200).json({ status: "ok", data: booking });
  } catch (err) {
    next(err);
  }
}

export async function patchTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw ApiError.badRequest("Booking ID is required");
    }
    const fromCoachId = req.coachId!;
    const { toCoachId, reason } = transferSchema.parse(req.body);
    const booking = await transferBooking({
      bookingId: id,
      fromCoachId,
      toCoachId,
      reason,
    });
    res.status(200).json({ status: "ok", data: booking });
  } catch (err) {
    next(err);
  }
}

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function patchClientComplete(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw ApiError.badRequest("Booking ID is required");
    }
    const clientId = req.authUser!.userId;
    const booking = await markCompletedByClient(id, clientId);
    res.status(200).json({ status: "ok", data: booking });
  } catch (err) {
    next(err);
  }
}

export async function patchCoachComplete(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw ApiError.badRequest("Booking ID is required");
    }
    const coachId = req.coachId!;
    const booking = await markCompletedByCoach(id, coachId);
    res.status(200).json({ status: "ok", data: booking });
  } catch (err) {
    next(err);
  }
}

export async function postReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw ApiError.badRequest("Booking ID is required");
    }
    const clientId = req.authUser!.userId;
    const { rating, comment } = reviewSchema.parse(req.body);
    const review = await createReview({ bookingId: id, clientId, rating, comment });
    res.status(201).json({ status: "ok", data: review });
  } catch (err) {
    next(err);
  }
}

export async function getCallRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw ApiError.badRequest("Booking ID is required");
    }
    const userId = req.authUser!.userId;
    const access = await getBookingCallAccess(id, userId);
    res.status(200).json({ status: "ok", data: access });
  } catch (err) {
    next(err);
  }
}

export async function getCoachBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const coachId = req.coachId!;
    const bookings = await listCoachBookings(coachId);
    res.status(200).json({ status: "ok", data: bookings });
  } catch (err) {
    next(err);
  }
}

const approveSchema = z.object({
  scheduledAt: z.string().datetime(),
  scheduledEndAt: z.string().datetime(),
});

