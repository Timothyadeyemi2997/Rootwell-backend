import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  listPublishedTestimonials,
  listAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "../services/testimonialService";

const testimonialSchema = z.object({
  quote: z.string().min(3),
  name: z.string().min(1),
  result: z.string().min(1),
  published: z.boolean().optional(),
});

const testimonialUpdateSchema = testimonialSchema.partial();

export async function getPublicTestimonials(_req: Request, res: Response, next: NextFunction) {
  try {
    const testimonials = await listPublishedTestimonials();
    res.status(200).json({ status: "ok", data: testimonials });
  } catch (err) {
    next(err);
  }
}

export async function getAllTestimonials(_req: Request, res: Response, next: NextFunction) {
  try {
    const testimonials = await listAllTestimonials();
    res.status(200).json({ status: "ok", data: testimonials });
  } catch (err) {
    next(err);
  }
}

export async function postTestimonial(req: Request, res: Response, next: NextFunction) {
  try {
    const input = testimonialSchema.parse(req.body);
    const testimonial = await createTestimonial(input);
    res.status(201).json({ status: "ok", data: testimonial });
  } catch (err) {
    next(err);
  }
}

export async function patchTestimonial(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw new Error("Testimonial ID is required");
    }
    const input = testimonialUpdateSchema.parse(req.body);
    const testimonial = await updateTestimonial(id, input);
    res.status(200).json({ status: "ok", data: testimonial });
  } catch (err) {
    next(err);
  }
}

export async function deleteTestimonialHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw new Error("Testimonial ID is required");
    }
    await deleteTestimonial(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}