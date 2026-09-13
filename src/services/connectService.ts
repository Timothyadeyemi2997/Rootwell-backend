import { stripe } from "../config/stripe";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export async function getOrCreateConnectAccount(coachId: string) {
  const existing = await prisma.payoutAccount.findUnique({ where: { coachId } });
  if (existing) return existing;

  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    include: { user: true },
  });
  if (!coach) throw ApiError.notFound("Coach not found");

  const account = await stripe.accounts.create({
    type: "express",
    email: coach.user.email,
    capabilities: {
      transfers: { requested: true },
    },
  });

  return prisma.payoutAccount.create({
    data: {
      coachId,
      stripeAccountId: account.id,
      onboardingComplete: false,
      payoutsEnabled: false,
    },
  });
}

export async function createOnboardingLink(coachId: string) {
  const payoutAccount = await getOrCreateConnectAccount(coachId);
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const accountLink = await stripe.accountLinks.create({
    account: payoutAccount.stripeAccountId,
    refresh_url: `${frontendUrl}/portal/payout-setup?refresh=true`,
    return_url: `${frontendUrl}/portal/payout-setup?complete=true`,
    type: "account_onboarding",
  });

  return accountLink.url;
}

export async function syncAccountStatus(stripeAccountId: string) {
  const account = await stripe.accounts.retrieve(stripeAccountId);

  await prisma.payoutAccount.update({
    where: { stripeAccountId },
    data: {
      onboardingComplete: account.details_submitted ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
    },
  });
}