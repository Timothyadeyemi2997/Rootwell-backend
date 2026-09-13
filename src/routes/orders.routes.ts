import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { getOrderBySession } from "../controllers/orders.controller";

const router = Router();

router.get("/by-session/:sessionId", requireAuth, getOrderBySession);

export default router;