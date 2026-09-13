import { Router } from "express";
import passport from "../config/passport";
import { googleCallback, logout } from "../controllers/auth.controller";
import { register, login, registerCoach } from "../controllers/auth.controller";
import { leadRateLimiter } from "../middleware/rateLimiter"; // reusing the same limiter shape
import { forgotPassword, resetPassword } from "../controllers/auth.controller";

const router = Router();

router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", leadRateLimiter, forgotPassword);
router.post("/reset-password", leadRateLimiter, resetPassword);
router.post('/register-coach', registerCoach);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login-failed" }),
  googleCallback
);




router.post("/logout", logout);

export default router;