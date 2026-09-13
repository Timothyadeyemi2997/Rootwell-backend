import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { getLeads, getRequestLogs, getBookingLogs } from "../controllers/admin.controller";

const router = Router();

router.get("/leads", requireAuth, requireRole("ADMIN"), getLeads);
router.get("/logs/requests", requireAuth, requireRole("ADMIN"), getRequestLogs);
router.get("/logs/bookings", requireAuth, requireRole("ADMIN"), getBookingLogs);

export default router;