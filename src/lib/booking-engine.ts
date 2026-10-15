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
  endB: Date,
  bufferMinutes: number = 0
): boolean {
  const bufferMs = Math.max(0, bufferMinutes) * 60 * 1000;
  return (
    startA.getTime() < endB.getTime() + bufferMs &&
    endA.getTime() + bufferMs > startB.getTime()
  );
}

/**
 * Queries the database for conflicting CONFIRMED reservations for a specific resource.
 * Supports turnaround buffer logic: EffectiveEnd = ReservationEnd + BufferMinutes
 * Supports self-exclusion (excludeReservationId) for editing operations.
 */
export async function findConflict(
  tx: any,
  params: {
    resourceId: string;
    startTime: Date;
    endTime: Date;
    excludeReservationId?: string;
  }
) {
  const { resourceId, startTime, endTime, excludeReservationId } = params;

  // 1. Fetch resource attributes to determine if a turnaround buffer is configured
  const resource = await tx.resource.findUnique({
    where: { id: resourceId },
    select: { attributes: true },
  });

  const bufferMinutes = Number((resource?.attributes as any)?.bufferMinutes) || 0;
  const bufferMs = Math.max(0, bufferMinutes) * 60 * 1000;

  // With a turnaround buffer B:
  // EffectiveEnd = ReservationEnd + BufferMinutes
  // A requested reservation [startTime, endTime) conflicts with an existing reservation [b.startTime, b.endTime)
  // if their effective turnaround windows overlap:
  // b.startTime < endTime + bufferMs  AND  b.endTime + bufferMs > startTime
  // (which is equivalent to: b.endTime > startTime - bufferMs)
  const effectiveQueryEnd = new Date(endTime.getTime() + bufferMs);
  const effectiveQueryStart = new Date(startTime.getTime() - bufferMs);

  const conflicting = await tx.reservation.findFirst({
    where: {
      resourceId,
      status: ReservationStatus.CONFIRMED,
      ...(excludeReservationId
        ? { id: { not: excludeReservationId } }
        : {}),
      AND: [
        { startTime: { lt: effectiveQueryEnd } },
        { endTime: { gt: effectiveQueryStart } },
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

  if (!conflicting) return null;

  // Distinguish between a direct meeting time overlap and a turnaround buffer conflict
  const isDirectMeetingOverlap =
    conflicting.startTime.getTime() < endTime.getTime() &&
    conflicting.endTime.getTime() > startTime.getTime();

  return {
    ...conflicting,
    isBufferConflict: !isDirectMeetingOverlap && bufferMinutes > 0,
    bufferMinutes,
  };
}

/**
 * Formats a clean, descriptive conflict error message for users
 */
export function formatConflictMessage(conflictingReservation: {
  title: string;
  startTime: Date;
  endTime: Date;
  status?: ReservationStatus | string;
  isPrivate?: boolean;
  user?: { name: string } | null;
  isBufferConflict?: boolean;
  bufferMinutes?: number;
}): string {
  const timeSlot = `${formatTime(conflictingReservation.startTime)} - ${formatTime(
    conflictingReservation.endTime
  )}`;
  const organizer = conflictingReservation.user?.name
    ? ` by ${conflictingReservation.user.name}`
    : "";

  const titleText = conflictingReservation.isPrivate ? "Private Reservation" : conflictingReservation.title;

  if (conflictingReservation.isBufferConflict && conflictingReservation.bufferMinutes) {
    const buffer = conflictingReservation.bufferMinutes;
    return `Turnaround Buffer Conflict: This facility enforces a mandatory ${buffer}-minute turnaround buffer (cleaning/reset) between bookings. It collides with the turnaround window for "${titleText}" (${timeSlot}${organizer}).`;
  }

  return `Conflict detected: Time overlaps with "${titleText}" (${timeSlot}${organizer}). Please choose a different time slot.`;
}

/**
 * Smart Alternative & Next Available Slot Engine
 * Analyzes conflicting slots and intelligently suggests:
 * 1. The next available gap in the same resource on that day (accounting for turnaround buffer).
 * 2. An alternative active resource in the same category that is 100% free at the requested time.
 */
export async function findSmartAlternatives(
  prismaClient: any,
  params: {
    resourceId: string;
    startTime: Date;
    endTime: Date;
    excludeReservationId?: string;
  }
) {
  try {
    const requestedDurationMs = params.endTime.getTime() - params.startTime.getTime();
    if (requestedDurationMs <= 0) return { nextAvailableSlot: null, alternativeResource: null };

    // 1. Fetch current resource with its category and attributes
    const currentResource = await prismaClient.resource.findUnique({
      where: { id: params.resourceId },
      include: { category: true },
    });

    if (!currentResource) return { nextAvailableSlot: null, alternativeResource: null };

    const bufferMinutes = Number((currentResource?.attributes as any)?.bufferMinutes) || 0;
    const bufferMs = Math.max(0, bufferMinutes) * 60 * 1000;

    // --- Search Strategy 1: Next Available Slot for currentResource on this day ---
    let nextAvailableSlot: {
      startTime: string;
      endTime: string;
      display: string;
      startHHMM: string;
      endHHMM: string;
    } | null = null;

    // Scan up to end of the day (22:00)
    const dayEnd = new Date(params.startTime);
    dayEnd.setHours(22, 0, 0, 0);

    const activeBookings = await prismaClient.reservation.findMany({
      where: {
        resourceId: params.resourceId,
        status: ReservationStatus.CONFIRMED,
        ...(params.excludeReservationId ? { id: { not: params.excludeReservationId } } : {}),
        startTime: { lt: dayEnd },
        endTime: { gt: new Date(params.startTime.getTime() - bufferMs) },
      },
      orderBy: { startTime: "asc" },
    });

    for (const booking of activeBookings) {
      // The candidate slot starts after the previous booking ends PLUS the turnaround buffer
      const candidateStart = new Date(
        Math.max(booking.endTime.getTime() + bufferMs, params.startTime.getTime())
      );
      const candidateEnd = new Date(candidateStart.getTime() + requestedDurationMs);

      if (candidateEnd <= dayEnd) {
        const collides = activeBookings.some((b: any) =>
          hasTimeOverlap(candidateStart, candidateEnd, b.startTime, b.endTime, bufferMinutes)
        );

        if (!collides) {
          const formatHHMM = (d: Date) =>
            `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

          nextAvailableSlot = {
            startTime: candidateStart.toISOString(),
            endTime: candidateEnd.toISOString(),
            display: `${formatTime(candidateStart)} - ${formatTime(candidateEnd)}`,
            startHHMM: formatHHMM(candidateStart),
            endHHMM: formatHHMM(candidateEnd),
          };
          break;
        }
      }
    }

    // --- Search Strategy 2: Alternative Resource in same category for exact requested time ---
    let alternativeResource: {
      id: string;
      name: string;
      location: string;
      capacity: number | null;
      categoryName: string;
    } | null = null;

    const siblings = await prismaClient.resource.findMany({
      where: {
        categoryId: currentResource.categoryId,
        id: { not: currentResource.id },
        status: ResourceStatus.ACTIVE,
      },
      orderBy: [{ capacity: "asc" }, { name: "asc" }],
    });

    for (const sibling of siblings) {
      const sibBuffer = Number((sibling?.attributes as any)?.bufferMinutes) || 0;
      const sibBufferMs = Math.max(0, sibBuffer) * 60 * 1000;

      const conflictOnSibling = await prismaClient.reservation.findFirst({
        where: {
          resourceId: sibling.id,
          status: ReservationStatus.CONFIRMED,
          AND: [
            { startTime: { lt: new Date(params.endTime.getTime() + sibBufferMs) } },
            { endTime: { gt: new Date(params.startTime.getTime() - sibBufferMs) } },
          ],
        },
      });

      if (!conflictOnSibling) {
        alternativeResource = {
          id: sibling.id,
          name: sibling.name,
          location: sibling.location,
          capacity: sibling.capacity,
          categoryName: currentResource.category.name,
        };
        break;
      }
    }

    return { nextAvailableSlot, alternativeResource };
  } catch (error) {
    console.error("findSmartAlternatives error:", error);
    return { nextAvailableSlot: null, alternativeResource: null };
  }
}