import Stripe from "stripe";
import { stripe } from "../config/stripe";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

interface CreateCheckoutInput {
  userId: string;
  programId: string;
}

export async function createCheckoutSession(input: CreateCheckoutInput) {
  const { userId, programId } = input;

  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) throw ApiError.notFound("Program not found");

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: program.name, description: program.description },
          unit_amount: program.priceCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/checkout/cancelled`,
    metadata: { userId, programId },
  });

  await prisma.order.create({
    data: {
      userId,
      programId,
      stripeSessionId: session.id,
      amountCents: program.priceCents,
      status: "PENDING",
    },
  });

  return session;
}

export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  const order = await prisma.order.findUnique({
    where: { stripeSessionId: session.id },
  });

  if (!order) {
    console.error(`Webhook received for unknown session: ${session.id}`);
    return;
  }

  if (order.status === "PAID") {
    // already processed — Stripe can send duplicate events, this makes it a no-op
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      stripePaymentIntentId: paymentIntentId ?? null,
      paidAt: new Date(),
    },
  });

  const existingEnrollment = await prisma.enrollment.findFirst({
    where: { clientId: order.userId, programId: order.programId },
  });

  if (!existingEnrollment) {
    await prisma.enrollment.create({
      data: {
        clientId: order.userId,
        programId: order.programId,
        progress: {},
      },
    });
  }
}