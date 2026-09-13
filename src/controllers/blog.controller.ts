import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  listPublishedPosts,
  getPublishedPostBySlug,
  listAllPosts,
  createPost,
  updatePost,
  deletePost,
} from "../services/blogService";

const postSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  body: z.string().min(1),
  tag: z.string().min(1),
  published: z.boolean().optional(),
});

const postUpdateSchema = postSchema.partial();

export async function getPublicPosts(_req: Request, res: Response, next: NextFunction) {
  try {
    const posts = await listPublishedPosts();
    res.status(200).json({ status: "ok", data: posts });
  } catch (err) {
    next(err);
  }
}

export async function getPublicPostBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    if (typeof slug !== "string") {
      throw new Error("Slug is required");
    }
    const post = await getPublishedPostBySlug(slug);
    res.status(200).json({ status: "ok", data: post });
  } catch (err) {
    next(err);
  }
}

export async function getAllPosts(_req: Request, res: Response, next: NextFunction) {
  try {
    const posts = await listAllPosts();
    res.status(200).json({ status: "ok", data: posts });
  } catch (err) {
    next(err);
  }
}

export async function postBlogPost(req: Request, res: Response, next: NextFunction) {
  try {
    const input = postSchema.parse(req.body);
    const post = await createPost(input);
    res.status(201).json({ status: "ok", data: post });
  } catch (err) {
    next(err);
  }
}

export async function patchBlogPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw new Error("Post ID is required");
    }
    const input = postUpdateSchema.parse(req.body);
    const post = await updatePost(id, input);
    res.status(200).json({ status: "ok", data: post });
  } catch (err) {
    next(err);
  }
}

export async function deleteBlogPostHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw new Error("Post ID is required");
    }
    await deletePost(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}