import { prisma } from "../config/prisma";

export async function captureLead(email: string, source = "lead-magnet") {
  return prisma.lead.upsert({
    where: { email },
    update: {}, // already exists — no-op, don't overwrite capturedAt or source
    create: { email, source },
  });
}