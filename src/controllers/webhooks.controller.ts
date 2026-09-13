import { Request, Response } from "express";
import { stripe } from "../config/stripe";
import { fulfillCheckoutSession } from "../services/stripeService";
import { syncAccountStatus } from "../services/connectService";

const rawWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!rawWebhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set in the environment");
}
const webhookSecret: string = rawWebhookSecret;

export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"];

  if (!signature || Array.isArray(signature)) {
    return res.status(400).send("Missing stripe-signature header");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      await fulfillCheckoutSession(session);
      break;
    }
    case "account.updated": {
      const account = event.data.object;
      await syncAccountStatus(account.id);
      break;
    }
    default:
      break;
  }

  res.status(200).json({ received: true });
}