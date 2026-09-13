import rateLimit from "express-rate-limit";

export const leadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests. Please try again later." },
});