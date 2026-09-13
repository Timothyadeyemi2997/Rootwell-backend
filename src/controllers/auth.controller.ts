import { Request, Response, NextFunction } from "express";
import { User } from "../generated/prisma/client";
import { signAccessToken, signRefreshToken } from "../utils/jwt";
import { setAuthCookies, clearAuthCookies } from "../utils/cookies";
import { z } from "zod";
import { registerWithPassword, loginWithPassword, registerCoachWithPassword } from "../services/authService";
import { requestPasswordReset, resetPasswordWithCode } from "../services/passwordResetService";

export function googleCallback(req: Request, res: Response) {
  const user = req.user as User;

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  setAuthCookies(res, accessToken, refreshToken);

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const redirectPath = user.role === "ADMIN" ? "/admin" : user.role === "COACH" ? "/portal" : "/portal";

  res.redirect(`${frontendUrl}${redirectPath}`);
}

export function logout(_req: Request, res: Response) {
  clearAuthCookies(res);
  res.status(200).json({ status: "ok", message: "Logged out" });
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const user = await registerWithPassword(email, password, name);

    const payload = { userId: user.id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      status: "ok",
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await loginWithPassword(email, password);

    const payload = { userId: user.id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({
      status: "ok",
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

const forgotPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8),
});

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await requestPasswordReset(email);
    res.status(200).json({
      status: "ok",
      message: "If an account exists for that email, a reset code has been sent.",
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, code, newPassword } = resetPasswordSchema.parse(req.body);
    await resetPasswordWithCode(email, code, newPassword);
    res.status(200).json({ status: "ok", message: "Password reset successful. You can now log in." });
  } catch (err) {
    next(err);
  }
}

// auth.controller.ts addition
const registerCoachSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  bio: z.string().min(10),
  specialties: z.array(z.string()).min(1),
});

export async function registerCoach(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerCoachSchema.parse(req.body);
    const { user, coach } = await registerCoachWithPassword(input);

    const payload = { userId: user.id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({ status: "ok", data: { user, coachId: coach.id } });
  } catch (err) {
    next(err);
  }
}