import argon2 from "argon2";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { sendPasswordResetCode } from "./mailService";

const CODE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

function generateCode(): string {
  // 6-digit numeric code, e.g. "042917"
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always behave the same way whether the user exists or not —
  // prevents an attacker from using this endpoint to discover valid emails.
  if (!user || !user.passwordHash) {
    return;
  }

  const code = generateCode();
  const codeHash = await argon2.hash(code);

  await prisma.passwordResetCode.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_EXPIRY_MS),
    },
  });

  await sendPasswordResetCode({ to: user.email, name: user.name, code });
}

export async function resetPasswordWithCode(email: string, code: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("Invalid or expired code");
  }

  const candidates = await prisma.passwordResetCode.findMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  let matched: (typeof candidates)[number] | null = null;
  for (const candidate of candidates) {
    if (await argon2.verify(candidate.codeHash, code)) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    throw new Error("Invalid or expired code");
  }

  const newPasswordHash = await argon2.hash(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash } }),
    prisma.passwordResetCode.update({ where: { id: matched.id }, data: { usedAt: new Date() } }),
  ]);
}