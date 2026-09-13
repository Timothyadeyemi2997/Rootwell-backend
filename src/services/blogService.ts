import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export async function listPublishedPosts() {
  return prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPublishedPostBySlug(slug: string) {
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || !post.published) {
    throw ApiError.notFound("Post not found");
  }
  return post;
}

export async function listAllPosts() {
  return prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
  });
}

interface BlogPostInput {
  title: string;
  slug: string;
  body: string;
  tag: string;
  published?: boolean;
}

export async function createPost(input: BlogPostInput) {
  const existing = await prisma.blogPost.findUnique({ where: { slug: input.slug } });
  if (existing) throw ApiError.conflict("A post with this slug already exists");

  return prisma.blogPost.create({ data: input });
}

export async function updatePost(id: string, input: Partial<BlogPostInput>) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Post not found");

  if (input.slug && input.slug !== existing.slug) {
    const slugTaken = await prisma.blogPost.findUnique({ where: { slug: input.slug } });
    if (slugTaken) throw ApiError.conflict("A post with this slug already exists");
  }

  return prisma.blogPost.update({ where: { id }, data: input });
}

export async function deletePost(id: string) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Post not found");

  return prisma.blogPost.delete({ where: { id } });
}