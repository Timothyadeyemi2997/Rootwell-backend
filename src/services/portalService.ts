import { prisma } from "../config/prisma";

export async function getClientOverview(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { clientId: userId },
    include: { program: true },
    orderBy: { startedAt: "desc" },
  });

  return { user, enrollments };
}

export async function getClientBookings(userId: string) {
  return prisma.booking.findMany({
    where: { clientId: userId },
    include: {
      coach: { include: { user: { select: { name: true } } } },
      review: true,
    },
    orderBy: { scheduledAt: "desc" },
  });
}