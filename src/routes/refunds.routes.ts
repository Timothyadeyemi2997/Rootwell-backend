import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { resolveCoachId } from "../middleware/resolveCoachId";
import { patchRefundDecision } from "../controllers/refunds.controller";

const router = Router();

router.patch("/:id/decision", requireAuth, requireRole("COACH"), resolveCoachId, patchRefundDecision);

export default router;