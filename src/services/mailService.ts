import { transporter } from "../config/mailer";

const FROM = `"Rootwell" <${process.env.EMAIL_USER}>`;

async function send(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
  }
}

interface BookingConfirmationInput {
  to: string;
  clientName: string;
  coachName: string;
  coachBio: string;
  reason: string;
  scheduledAt: Date;
  amountCents: number;
  transactionId: string;
}

export async function sendBookingConfirmation(input: BookingConfirmationInput) {
  const { to, clientName, coachName, coachBio, reason, scheduledAt, amountCents, transactionId } = input;
  await send(
    to,
    "Your session is confirmed",
    `<h2>Hi ${clientName}, you're booked in.</h2>
     <p><strong>Reason:</strong> ${reason}</p>
     <p><strong>When:</strong> ${scheduledAt.toLocaleString()}</p>
     <p><strong>Coach:</strong> ${coachName} — ${coachBio}</p>
     <p><strong>Amount paid:</strong> $${(amountCents / 100).toFixed(2)}</p>
     <p><strong>Transaction ID:</strong> ${transactionId}</p>`
  );
}

export async function sendNewBookingAlert(input: {
  to: string;
  coachName: string;
  clientName: string;
  reason: string;
  scheduledAt: Date;
}) {
  const { to, coachName, clientName, reason, scheduledAt } = input;
  await send(
    to,
    "New client booking",
    `<h2>Hi ${coachName}, you have a new session.</h2>
     <p><strong>Client:</strong> ${clientName}</p>
     <p><strong>Reason:</strong> ${reason}</p>
     <p><strong>When:</strong> ${scheduledAt.toLocaleString()}</p>`
  );
}

export async function sendBookingRescheduled(input: {
  to: string;
  clientName: string;
  previousTime: Date;
  newTime: Date;
}) {
  const { to, clientName, previousTime, newTime } = input;
  await send(
    to,
    "Your session has been rescheduled",
    `<h2>Hi ${clientName}, your session time changed.</h2>
     <p><strong>Previous time:</strong> ${previousTime.toLocaleString()}</p>
     <p><strong>New time:</strong> ${newTime.toLocaleString()}</p>`
  );
}

export async function sendBookingCancelled(input: {
  to: string;
  clientName: string;
  cancellationReason: string;
}) {
  const { to, clientName, cancellationReason } = input;
  await send(
    to,
    "Your session has been cancelled",
    `<h2>Hi ${clientName}, your session was cancelled.</h2>
     <p><strong>Reason:</strong> ${cancellationReason}</p>
     <p>If this isn't rescheduled within 48 hours, we'll follow up about a refund.</p>`
  );
}

export async function sendBookingTransferred(input: {
  to: string;
  clientName: string;
  newCoachName: string;
}) {
  const { to, clientName, newCoachName } = input;
  await send(
    to,
    "Your coach has changed",
    `<h2>Hi ${clientName}, your session was reassigned.</h2>
     <p>Your new coach is <strong>${newCoachName}</strong>. Your scheduled time is unchanged.</p>`
  );
}

export async function sendRefundDecisionPrompt(input: { to: string; coachName: string }) {
  const { to, coachName } = input;
  await send(
    to,
    "Action needed: refund decision",
    `<h2>Hi ${coachName}</h2>
     <p>A cancelled session wasn't rescheduled within 48 hours. Please log in to approve or deny a refund.</p>`
  );
}

export async function sendRefundApproved(input: { to: string; clientName: string }) {
  const { to, clientName } = input;
  await send(
    to,
    "Your refund is being processed",
    `<h2>Hi ${clientName}</h2><p>Your refund was approved and will be processed within 72 hours.</p>`
  );
}

export async function sendRefundDenied(input: { to: string; clientName: string }) {
  const { to, clientName } = input;
  await send(
    to,
    "Update on your cancelled session",
    `<h2>Hi ${clientName}</h2><p>Your coach has declined the refund request for your cancelled session. Contact support if you have questions.</p>`
  );
}

export async function sendRefundCompleted(input: { to: string; clientName: string }) {
  const { to, clientName } = input;
  await send(
    to,
    "Refund completed",
    `<h2>Hi ${clientName}</h2><p>Your refund has been completed and should appear on your original payment method shortly.</p>`
  );
}

export async function sendPasswordResetCode(input: { to: string; name: string; code: string }) {
  const { to, name, code } = input;
  await send(
    to,
    "Your password reset code",
    `<h2>Hi ${name}</h2>
     <p>Use this code to reset your password. It expires in 15 minutes.</p>
     <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
     <p>If you didn't request this, you can safely ignore this email.</p>`
  );
}

export async function sendBookingApprovalRequest(input: {
  to: string;
  coachName: string;
  clientName: string;
  clientEmail: string;
  reason: string;
  scheduledAt: Date;
  bookingId: string;
}) {
  const { to, coachName, clientName, clientEmail, reason, scheduledAt, bookingId } = input;
  const portalUrl = `${process.env.FRONTEND_URL}/portal/coach`;
  await send(
    to,
    "New session request — action needed",
    `<h2>Hi ${coachName}, a client wants to book with you.</h2>
     <p><strong>Client:</strong> ${clientName} (${clientEmail})</p>
     <p><strong>Reason:</strong> ${reason}</p>
     <p><strong>Requested time:</strong> ${scheduledAt.toLocaleString()}</p>
     <p>Please log in to approve or decline this request: <a href="${portalUrl}">${portalUrl}</a></p>
     <p style="font-size:12px;color:#888;">Booking reference: ${bookingId}</p>`
  );
}

export async function sendBookingPendingApproval(input: { to: string; clientName: string; coachName: string }) {
  const { to, clientName, coachName } = input;
  await send(
    to,
    "Your session request has been sent",
    `<h2>Hi ${clientName}</h2>
     <p>Your session request with ${coachName} has been sent for approval. You'll get a confirmation email once they accept.</p>`
  );
}