import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { postCheckoutSession } from "../controllers/payments.controller";

const router = Router();

router.post("/checkout/create-session", requireAuth, postCheckoutSession);

export default router;