import { Router } from "express";
import { createLead } from "../controllers/leads.controller";
import { leadRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/", leadRateLimiter, createLead);

export default router;