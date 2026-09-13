import { stripe } from "../config/stripe";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

const MIN_WITHDRAWAL_CENTS = 5_000; // $50.00

export async function getAvailableBalance(coachId: string): Promise<number> {
  const result = await prisma.payout.aggregate({
    where: { coachId, status: "RELEASED" },
    _sum: { netAmountCents: true },
  });
  return result._sum.netAmountCents ?? 0;
}

export async function requestWithdrawal(coachId: string) {
  const payoutAccount = await prisma.payoutAccount.findUnique({ where: { coachId } });

  if (!payoutAccount || !payoutAccount.payoutsEnabled) {
    throw ApiError.forbidden("Connect your payout account before requesting a withdrawal");
  }

  const eligiblePayouts = await prisma.payout.findMany({
    where: { coachId, status: "RELEASED" },
  });

  const totalCents = eligiblePayouts.reduce((sum, p) => sum + p.netAmountCents, 0);

  if (totalCents < MIN_WITHDRAWAL_CENTS) {
    throw ApiError.badRequest(
      `Minimum withdrawal is $${(MIN_WITHDRAWAL_CENTS / 100).toFixed(2)}. Current balance: $${(totalCents / 100).toFixed(2)}`
    );
  }

  const withdrawal = await prisma.withdrawal.create({
    data: {
      coachId,
      amountCents: totalCents,
      status: "PROCESSING",
      payouts: { connect: eligiblePayouts.map((p) => ({ id: p.id })) },
    },
  });

  try {
    const transfer = await stripe.transfers.create({
      amount: totalCents,
      currency: "usd",
      destination: payoutAccount.stripeAccountId,
    });

    await prisma.$transaction([
      prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: "PAID", processedAt: new Date() },
      }),
      prisma.payout.updateMany({
        where: { id: { in: eligiblePayouts.map((p) => p.id) } },
        data: { status: "WITHDRAWN" },
      }),
    ]);

    return { withdrawal, transferId: transfer.id };
  } catch (err) {
    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: "FAILED" },
    });
    throw ApiError.internal("Withdrawal transfer failed. Please try again or contact support.");
  }
}