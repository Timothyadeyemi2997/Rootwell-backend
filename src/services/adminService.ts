import { prisma } from "../config/prisma";

export async function listLeads() {
  return prisma.lead.findMany({
    orderBy: { capturedAt: "desc" },
  });
}

interface RequestLogFilters {
  limit?: number;
  path?: string;
}

export async function listRequestLogs(filters: RequestLogFilters = {}) {
  const { limit = 100, path } = filters;

  return prisma.requestLog.findMany({
    where: path ? { path: { contains: path } } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listBookingLogs(bookingId?: string) {
  return prisma.bookingLog.findMany({
    where: bookingId ? { bookingId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      performedBy: { select: { name: true, email: true } },
    },
    take: 200,
  });
}