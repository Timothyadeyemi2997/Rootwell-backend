import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export async function getOrderBySessionId(sessionId: string, userId: string) {
  const order = await prisma.order.findUnique({ where: { stripeSessionId: sessionId } });
  if (!order || order.userId !== userId) {
    throw ApiError.notFound("Order not found");
  }
  return order;
}