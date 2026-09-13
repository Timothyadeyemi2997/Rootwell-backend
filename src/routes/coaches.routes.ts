import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { resolveCoachId } from "../middleware/resolveCoachId";
import { upload } from "../middleware/upload";
import {
  getCoaches,
  getCoach,
  getSlots,
  postProfileImage,
} from "../controllers/coaches.controller";

const router = Router();

router.get("/", getCoaches);
router.get("/:id", getCoach);
router.get("/:id/slots", getSlots);

router.post(
  "/me/profile-image",
  requireAuth,
  requireRole("COACH"),
  resolveCoachId,
  upload.single("image"),
  postProfileImage
);

export default router;