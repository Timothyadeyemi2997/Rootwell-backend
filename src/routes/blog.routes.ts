import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import {
  getPublicPosts,
  getPublicPostBySlug,
  getAllPosts,
  postBlogPost,
  patchBlogPost,
  deleteBlogPostHandler,
} from "../controllers/blog.controller";

const router = Router();

// public
router.get("/", getPublicPosts);
router.get("/:slug", getPublicPostBySlug);

// admin-only
router.get("/admin/all", requireAuth, requireRole("ADMIN"), getAllPosts);
router.post("/admin", requireAuth, requireRole("ADMIN"), postBlogPost);
router.patch("/admin/:id", requireAuth, requireRole("ADMIN"), patchBlogPost);
router.delete("/admin/:id", requireAuth, requireRole("ADMIN"), deleteBlogPostHandler);

export default router;