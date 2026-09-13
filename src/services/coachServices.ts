import { prisma } from "../config/prisma";
import  { cloudinary } from "../config/cloudinary";
async function getCoachStats(coachId: string) {
  const [completedSessions, ratingAggregate] = await Promise.all([
    prisma.booking.count({
      where: { coachId, status: "COMPLETED" },
    }),
    prisma.review.aggregate({
      where: { coachId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  return {
    completedSessions,
    averageRating: ratingAggregate._avg.rating ?? null,
    reviewCount: ratingAggregate._count.rating,
  };
}

export async function listCoaches() {
  const coaches = await prisma.coach.findMany({
    include: {
      user: { select: { name: true } },
      availability: true,
    },
  });

  return Promise.all(
    coaches.map(async (coach) => ({
      ...coach,
      stats: await getCoachStats(coach.id),
    }))
  );
}

export async function getCoachById(coachId: string) {
  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    include: {
      user: { select: { name: true } },
      availability: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          client: { select: { name: true } },
        },
      },
    },
  });

  if (!coach) return null;

  const stats = await getCoachStats(coachId);

  return { ...coach, stats };
}

export async function uploadCoachProfileImage(coachId: string, fileBuffer: Buffer): Promise<string> {
  const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "rootwell/coaches", transformation: [{ width: 600, height: 800, crop: "fill" }] },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });

  await prisma.coach.update({
    where: { id: coachId },
    data: { profileImageUrl: uploadResult.secure_url },
  });

  return uploadResult.secure_url;
}