import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { Coach } from "../generated/prisma/client";

const dayjsWeekday = (date: Date) => date.getDay(); // 0 (Sun) - 6 (Sat)

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Checks whether a given datetime falls inside one of a coach's
 * recurring weekly availability windows.
 */
function isWithinAvailability(
  scheduledAt: Date,
  availability: { dayOfWeek: number; startTime: string; endTime: string }[]
): boolean {
  const day = dayjsWeekday(scheduledAt);
  const minutesIntoDay = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();

  return availability.some((slot) => {
    if (slot.dayOfWeek !== day) return false;
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);
    return minutesIntoDay >= start && minutesIntoDay < end;
  });
}

/**
 * Counts a coach's active (non-cancelled, non-completed) bookings —
 * this is what gets checked against maxClients.
 */
async function getActiveBookingCount(coachId: string): Promise<number> {
  return prisma.booking.count({
    where: {
      coachId,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });
}

async function hasCapacity(coach: Coach): Promise<boolean> {
  const activeCount = await getActiveBookingCount(coach.id);
  return activeCount < coach.maxClients;
}

/**
 * Attempts to find a single coach matching the requested specialty
 * and time slot, with open capacity. Returns null if none match —
 * callers use that to trigger the "suggest alternatives" flow.
 */
export async function findAvailableCoach(
  specialty: string,
  scheduledAt: Date
): Promise<Coach | null> {
  const candidates = await prisma.coach.findMany({
    where: { specialties: { has: specialty } },
    include: { availability: true },
  });

  for (const coach of candidates) {
    const withinHours = isWithinAvailability(scheduledAt, coach.availability);
    if (!withinHours) continue;

    const capacityOk = await hasCapacity(coach);
    if (!capacityOk) continue;

    return coach;
  }

  return null;
}

/**
 * Returns coaches with the right specialty and open capacity,
 * regardless of the originally requested time — used to populate
 * the "here are other coaches you could try" suggestion list.
 */
export async function suggestAlternativeCoaches(
  specialty: string,
  excludeCoachId?: string
): Promise<Coach[]> {
  const candidates = await prisma.coach.findMany({
    where: {
      specialties: { has: specialty },
      ...(excludeCoachId ? { id: { not: excludeCoachId } } : {}),
    },
    include: { availability: true },
  });

  const withCapacity: Coach[] = [];
  for (const coach of candidates) {
    if (await hasCapacity(coach)) {
      withCapacity.push(coach);
    }
  }

  return withCapacity;
}

/**
 * Validates that a specific coach can take a specific booking —
 * used both for the initial booking creation and for transfers,
 * where the target coach must be re-validated the same way.
 */
export async function assertCoachCanTakeBooking(
  coachId: string,
  scheduledAt: Date
): Promise<Coach> {
  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    include: { availability: true },
  });

  if (!coach) {
    throw ApiError.notFound("Coach not found");
  }

  if (!isWithinAvailability(scheduledAt, coach.availability)) {
    throw ApiError.badRequest("This time is outside the coach's availability");
  }

  if (!(await hasCapacity(coach))) {
    throw ApiError.conflict("This coach is at full capacity");
  }

  return coach;
}

export async function getAvailableSlots(coachId: string, fromDate: Date, toDate: Date) {
  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    include: { availability: true },
  });
  if (!coach) throw ApiError.notFound("Coach not found");

  const existingBookings = await prisma.booking.findMany({
    where: {
      coachId,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledAt: { gte: fromDate, lte: toDate },
    },
    select: { scheduledAt: true },
  });

  const bookedTimes = new Set(existingBookings.map((b) => b.scheduledAt.toISOString()));
  const slots: string[] = [];

  for (let day = new Date(fromDate); day <= toDate; day.setDate(day.getDate() + 1)) {
    const dayOfWeek = day.getDay();
    const windowsForDay = coach.availability.filter((a) => a.dayOfWeek === dayOfWeek);

    for (const window of windowsForDay) {
      const [startH, startM] = window.startTime.split(":").map(Number);
      const [endH, endM] = window.endTime.split(":").map(Number);

      let slot = new Date(day);
      slot.setHours(startH, startM, 0, 0);
      const end = new Date(day);
      end.setHours(endH, endM, 0, 0);

      while (slot < end) {
        if (slot > new Date() && !bookedTimes.has(slot.toISOString())) {
          slots.push(slot.toISOString());
        }
        slot = new Date(slot.getTime() + 60 * 60 * 1000); // 1-hour slots
      }
    }
  }

  return slots;
}