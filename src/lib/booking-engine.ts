import { Prisma, ResourceStatus, ReservationStatus } from "@prisma/client";
import { formatTime } from "@/lib/utils";

/**
 * Pure mathematical interval overlap check.
 * Two intervals [S1, E1) and [S2, E2) overlap if and only if S1 < E2 and E1 > S2.
 */
export function hasTimeOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

/**
 * Queries the database for conflicting CONFIRMED reservations for a specific resource.
 * Supports self-exclusion (excludeReservationId) for editing operations.
 */
export async function findConflict(
  tx: Prisma.TransactionClient,
  params: {
    resourceId: string;
    startTime: Date;
    endTime: Date;
    excludeReservationId?: string;
  }
) {
  const { resourceId, startTime, endTime, excludeReservationId } = params;

  return await tx.reservation.findFirst({
    where: {
      resourceId,
      status: ReservationStatus.CONFIRMED,
      // If editing, exclude the current reservation itself from collision detection
      ...(excludeReservationId
        ? { id: { not: excludeReservationId } }
        : {}),
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Formats a clean, descriptive conflict error message for users
 */
export function formatConflictMessage(conflictingReservation: {
  title: string;
  startTime: Date;
  endTime: Date;
  user?: { name: string } | null;
}): string {
  const timeSlot = `${formatTime(conflictingReservation.startTime)} – ${formatTime(
    conflictingReservation.endTime
  )}`;
  const organizer = conflictingReservation.user?.name
    ? ` by ${conflictingReservation.user.name}`
    : "";

  return `Conflict detected: Time overlaps with "${conflictingReservation.title}" (${timeSlot}${organizer}). Please choose a different time slot.`;
}
