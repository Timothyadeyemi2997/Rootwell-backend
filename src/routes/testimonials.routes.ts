import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import {
  getPublicTestimonials,
  getAllTestimonials,
  postTestimonial,
  patchTestimonial,
  deleteTestimonialHandler,
} from "../controllers/testimonials.controller";

const router = Router();

// public — used by the marketing site
router.get("/", getPublicTestimonials);

// admin-only
router.get("/admin/all", requireAuth, requireRole("ADMIN"), getAllTestimonials);
router.post("/admin", requireAuth, requireRole("ADMIN"), postTestimonial);
router.patch("/admin/:id", requireAuth, requireRole("ADMIN"), patchTestimonial);
router.delete("/admin/:id", requireAuth, requireRole("ADMIN"), deleteTestimonialHandler);

export default router;