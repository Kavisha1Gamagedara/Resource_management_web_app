"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { reservationSchema, ReservationInput } from "@/lib/validations/reservation";
import { findConflict, formatConflictMessage } from "@/lib/booking-engine";
import { ResourceStatus, ReservationStatus } from "@prisma/client";

/**
 * Story 3: Atomic reservation creation with transactional conflict prevention
 */
export async function createReservation(input: ReservationInput) {
  try {
    const user = await requireAuth();
    const validatedData = reservationSchema.parse(input);

    const reservation = await prisma.$transaction(async (tx) => {
      // 1. Verify resource availability status
      const resource = await tx.resource.findUnique({
        where: { id: validatedData.resourceId },
      });

      if (!resource) {
        throw new Error("Resource not found.");
      }

      if (resource.status !== ResourceStatus.ACTIVE) {
        throw new Error(
          `This resource is currently ${resource.status.toLowerCase()} and cannot be reserved.`
        );
      }

      // 2. Query for overlapping CONFIRMED reservations
      const conflict = await findConflict(tx, {
        resourceId: validatedData.resourceId,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
      });

      if (conflict) {
        throw new Error(formatConflictMessage(conflict));
      }

      // 3. Atomically create the reservation
      return await tx.reservation.create({
        data: {
          title: validatedData.title.trim(),
          notes: validatedData.notes?.trim() || null,
          startTime: validatedData.startTime,
          endTime: validatedData.endTime,
          resourceId: validatedData.resourceId,
          userId: user.id,
          status: ReservationStatus.CONFIRMED,
        },
        include: {
          resource: true,
          user: true,
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/resources");
    revalidatePath(`/resources/${validatedData.resourceId}`);
    revalidatePath("/reservations");
    revalidatePath("/my-reservations");

    return { success: true, reservation };
  } catch (error: any) {
    console.error("Create reservation error:", error);
    return {
      success: false,
      error: error?.message || "Failed to create reservation.",
    };
  }
}

/**
 * Story 4: Edit reservation with self-exclusion logic
 */
export async function updateReservation(id: string, input: ReservationInput) {
  try {
    const user = await requireAuth();
    if (!id) throw new Error("Reservation ID is required.");

    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!existingReservation) {
      throw new Error("Reservation not found.");
    }

    // Role check: Only the creator or an ADMIN can modify
    if (existingReservation.userId !== user.id && user.role !== "ADMIN") {
      throw new Error("You do not have permission to modify this reservation.");
    }

    const validatedData = reservationSchema.parse(input);

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Verify resource status
      const resource = await tx.resource.findUnique({
        where: { id: validatedData.resourceId },
      });

      if (!resource || resource.status !== ResourceStatus.ACTIVE) {
        throw new Error("This resource is currently unavailable.");
      }

      // 2. Check conflict with self-exclusion
      const conflict = await findConflict(tx, {
        resourceId: validatedData.resourceId,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        excludeReservationId: id, // Self-exclusion!
      });

      if (conflict) {
        throw new Error(formatConflictMessage(conflict));
      }

      // 3. Update reservation
      return await tx.reservation.update({
        where: { id },
        data: {
          title: validatedData.title.trim(),
          notes: validatedData.notes?.trim() || null,
          startTime: validatedData.startTime,
          endTime: validatedData.endTime,
          resourceId: validatedData.resourceId,
        },
        include: {
          resource: true,
          user: true,
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/resources");
    revalidatePath(`/resources/${validatedData.resourceId}`);
    revalidatePath("/reservations");
    revalidatePath("/my-reservations");

    return { success: true, reservation: updated };
  } catch (error: any) {
    console.error("Update reservation error:", error);
    return {
      success: false,
      error: error?.message || "Failed to update reservation.",
    };
  }
}

/**
 * Story 4: Cancel reservation to immediately free up the slot
 */
export async function cancelReservation(id: string) {
  try {
    const user = await requireAuth();
    if (!id) throw new Error("Reservation ID is required.");

    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!existingReservation) {
      throw new Error("Reservation not found.");
    }

    // Role check: Only owner or ADMIN can cancel
    if (existingReservation.userId !== user.id && user.role !== "ADMIN") {
      throw new Error("You do not have permission to cancel this reservation.");
    }

    const cancelled = await prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
      include: { resource: true },
    });

    revalidatePath("/");
    revalidatePath("/resources");
    revalidatePath(`/resources/${cancelled.resourceId}`);
    revalidatePath("/reservations");
    revalidatePath("/my-reservations");

    return { success: true, reservation: cancelled };
  } catch (error: any) {
    console.error("Cancel reservation error:", error);
    return {
      success: false,
      error: error?.message || "Failed to cancel reservation.",
    };
  }
}

/**
 * Client-callable live conflict check for instant feedback while typing
 */
export async function checkLiveConflict(params: {
  resourceId: string;
  startTime: string | Date;
  endTime: string | Date;
  excludeReservationId?: string;
}) {
  try {
    const start = new Date(params.startTime);
    const end = new Date(params.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { hasConflict: false };
    }

    // Validate that start time is not in the past
    if (start.getTime() < Date.now() - 60 * 1000) {
      return {
        hasConflict: true,
        message: "Cannot reserve slots in the past. Please select an upcoming date and time.",
      };
    }

    const conflict = await findConflict(prisma, {
      resourceId: params.resourceId,
      startTime: start,
      endTime: end,
      excludeReservationId: params.excludeReservationId,
    });

    if (conflict) {
      return {
        hasConflict: true,
        message: formatConflictMessage(conflict),
        conflictingReservation: {
          title: conflict.title,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          organizer: conflict.user.name,
        },
      };
    }

    return { hasConflict: false };
  } catch (error) {
    return { hasConflict: false };
  }
}
