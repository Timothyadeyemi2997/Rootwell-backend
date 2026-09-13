import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { resolveCoachId } from "../middleware/resolveCoachId";
import { getBalance, postWithdrawal } from "../controllers/withdrawals.controller";

const router = Router();

router.get("/balance", requireAuth, requireRole("COACH"), resolveCoachId, getBalance);
router.post("/", requireAuth, requireRole("COACH"), resolveCoachId, postWithdrawal);

export default router;