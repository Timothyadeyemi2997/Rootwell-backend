import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { resolveCoachId } from "../middleware/resolveCoachId";
import {
	postBooking,
	patchReschedule,
	patchCancel,
	patchTransfer,
	patchClientComplete,
	patchCoachComplete,
	postReview,
	getCallRoom,
	getCoachBookings,
	patchApprove,
	patchDecline,
} from "../controllers/bookings.controller";

const router = Router();

router.post("/", requireAuth, requireRole("CLIENT"), postBooking);
router.patch("/:id/reschedule", requireAuth, requireRole("COACH"), resolveCoachId, patchReschedule);
router.patch("/:id/cancel", requireAuth, requireRole("COACH"), resolveCoachId, patchCancel);
router.patch("/:id/transfer", requireAuth, requireRole("COACH"), resolveCoachId, patchTransfer);
router.post("/:id/complete/client", requireAuth, requireRole("CLIENT"), patchClientComplete);
router.patch("/:id/complete/coach", requireAuth, requireRole("COACH"), resolveCoachId, patchCoachComplete);
router.post("/:id/review", requireAuth, requireRole("CLIENT"), postReview);
router.get("/:id/call", requireAuth, getCallRoom);
router.get("/coach/mine", requireAuth, requireRole("COACH"), resolveCoachId, getCoachBookings);
router.patch("/:id/approve", requireAuth, requireRole("COACH"), resolveCoachId, patchApprove);
router.patch("/:id/decline", requireAuth, requireRole("COACH"), resolveCoachId, patchDecline);


export default router;