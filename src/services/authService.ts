import argon2 from "argon2";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export async function registerWithPassword(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await argon2.hash(password);

  return prisma.user.create({
    data: { email, name, passwordHash, role: "CLIENT" },
  });
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  return user;
}

// authService.ts addition
export async function registerCoachWithPassword(input: {
  email: string;
  password: string;
  name: string;
  bio: string;
  specialties: string[];
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const passwordHash = await argon2.hash(input.password);

  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash, role: "COACH" },
  });

  const coach = await prisma.coach.create({
    data: { userId: user.id, bio: input.bio, specialties: input.specialties },
  });

  return { user, coach };
}