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
      status: {
        in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING],
      },
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
  status?: ReservationStatus | string;
  isPrivate?: boolean;
  user?: { name: string } | null;
}): string {
  const timeSlot = `${formatTime(conflictingReservation.startTime)} - ${formatTime(
    conflictingReservation.endTime
  )}`;
  const organizer = conflictingReservation.user?.name
    ? ` by ${conflictingReservation.user.name}`
    : "";

  if (conflictingReservation.status === ReservationStatus.PENDING) {
    const titleText = conflictingReservation.isPrivate ? "Private Booking" : conflictingReservation.title;
    return `Conflict detected: Time overlaps with "${titleText}" (${timeSlot}${organizer}), which is currently pending administrator approval. Please choose a different time slot.`;
  }

  const titleText = conflictingReservation.isPrivate ? "Private Reservation" : conflictingReservation.title;
  return `Conflict detected: Time overlaps with "${titleText}" (${timeSlot}${organizer}). Please choose a different time slot.`;
}

/**
 * Smart Alternative & Next Available Slot Engine
 * Analyzes conflicting slots and intelligently suggests:
 * 1. The next available gap in the same resource on that day.
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

    // 1. Fetch current resource with its category
    const currentResource = await prismaClient.resource.findUnique({
      where: { id: params.resourceId },
      include: { category: true },
    });

    if (!currentResource) return { nextAvailableSlot: null, alternativeResource: null };

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
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
        ...(params.excludeReservationId ? { id: { not: params.excludeReservationId } } : {}),
        startTime: { lt: dayEnd },
        endTime: { gt: params.startTime },
      },
      orderBy: { startTime: "asc" },
    });

    for (const booking of activeBookings) {
      const candidateStart = new Date(Math.max(booking.endTime.getTime(), params.startTime.getTime()));
      const candidateEnd = new Date(candidateStart.getTime() + requestedDurationMs);

      if (candidateEnd <= dayEnd) {
        const collides = activeBookings.some(
          (b: any) =>
            candidateStart.getTime() < b.endTime.getTime() &&
            candidateEnd.getTime() > b.startTime.getTime()
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
      const conflictOnSibling = await prismaClient.reservation.findFirst({
        where: {
          resourceId: sibling.id,
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
          AND: [
            { startTime: { lt: params.endTime } },
            { endTime: { gt: params.startTime } },
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