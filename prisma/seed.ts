import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in the environment");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const testPasswordHash = await argon2.hash("coachpass123");

  const coach1User = await prisma.user.upsert({
    where: { email: "amara@rootwellcoaching.com" },
    update: { passwordHash: testPasswordHash },
    create: {
      email: "amara@rootwellcoaching.com",
      name: "Amara Chen",
      role: "COACH",
      oauthProvider: "seed",
      oauthId: "seed-coach-1",
      passwordHash: testPasswordHash,
    },
  });

  const coach1 = await prisma.coach.upsert({
    where: { userId: coach1User.id },
    update: {},
    create: {
      userId: coach1User.id,
      bio: "Certified Nutrition Coach with 6 years helping clients rebuild energy after burnout.",
      specialties: ["nutrition", "energy-reset", "burnout-recovery"],
      maxClients: 15,
      availability: {
        create: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 5, startTime: "09:00", endTime: "13:00" },
        ],
      },
    },
  });

  const coach2User = await prisma.user.upsert({
    where: { email: "daniel@rootwellcoaching.com" },
    update: { passwordHash: testPasswordHash },
    create: {
      email: "daniel@rootwellcoaching.com",
      name: "Daniel Osei",
      role: "COACH",
      oauthProvider: "seed",
      oauthId: "seed-coach-2",
      passwordHash: testPasswordHash,
    },
  });

  const coach2 = await prisma.coach.upsert({
    where: { userId: coach2User.id },
    update: {},
    create: {
      userId: coach2User.id,
      bio: "Movement and mindset coach specializing in sustainable habit change for busy professionals.",
      specialties: ["movement", "mindset", "corporate-wellness"],
      maxClients: 10,
      availability: {
        create: [
          { dayOfWeek: 2, startTime: "10:00", endTime: "18:00" },
          { dayOfWeek: 4, startTime: "10:00", endTime: "18:00" },
        ],
      },
    },
  });

  console.log("Seeded coaches:", coach1.id, coach2.id);

  const program = await prisma.program.upsert({
    where: { slug: "energy-reset-8wk" },
    update: {},
    create: {
      name: "8-Week Energy Reset",
      slug: "energy-reset-8wk",
      description: "A structured program to rebuild sleep, digestion, and steady energy.",
      priceCents: 10_000,
      durationWeeks: 8,
    },
  });

  console.log("Seeded program:", program.id);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });