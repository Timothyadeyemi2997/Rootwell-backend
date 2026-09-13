import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export async function listPublishedTestimonials() {
  return prisma.testimonial.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAllTestimonials() {
  return prisma.testimonial.findMany({
    orderBy: { createdAt: "desc" },
  });
}

interface TestimonialInput {
  quote: string;
  name: string;
  result: string;
  published?: boolean;
}

export async function createTestimonial(input: TestimonialInput) {
  return prisma.testimonial.create({ data: input });
}

export async function updateTestimonial(id: string, input: Partial<TestimonialInput>) {
  const existing = await prisma.testimonial.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Testimonial not found");

  return prisma.testimonial.update({ where: { id }, data: input });
}

export async function deleteTestimonial(id: string) {
  const existing = await prisma.testimonial.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Testimonial not found");

  return prisma.testimonial.delete({ where: { id } });
}