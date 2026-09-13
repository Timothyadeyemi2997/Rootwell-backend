import { prisma } from "../config/prisma";

export async function listPrograms() {
  return prisma.program.findMany({ orderBy: { priceCents: "asc" } });
}