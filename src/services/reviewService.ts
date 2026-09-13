import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

interface CreateReviewInput {
  bookingId: string;
  clientId: string;
  rating: number;
  comment?: string;
}

export async function createReview(input: CreateReviewInput) {
  const { bookingId, clientId, rating, comment } = input;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw ApiError.notFound("Booking not found");
  if (booking.clientId !== clientId) throw ApiError.forbidden("This is not your booking");
  if (booking.status !== "COMPLETED") {
    throw ApiError.badRequest("You can only review a completed session");
  }

  const existing = await prisma.review.findUnique({ where: { bookingId } });
  if (existing) throw ApiError.conflict("You've already reviewed this session");

  return prisma.review.create({
    data: {
      bookingId,
      clientId,
      coachId: booking.coachId,
      rating,
      comment,
    },
  });
}