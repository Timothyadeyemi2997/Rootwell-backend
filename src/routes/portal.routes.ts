import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { getMe, getMyBookings } from "../controllers/portal.controller";

const router = Router();

router.get("/me", requireAuth, getMe);
router.get("/bookings", requireAuth, getMyBookings);

export default router;