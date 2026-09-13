import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { resolveCoachId } from "../middleware/resolveCoachId";
import { postOnboardingLink } from "../controllers/connect.controller";

const router = Router();

router.post("/onboard", requireAuth, requireRole("COACH"), resolveCoachId, postOnboardingLink);

export default router;