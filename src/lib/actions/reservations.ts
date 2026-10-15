"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { requireAuth, requireAdmin, getCurrentUser } from "@/lib/auth";
import { reservationSchema, ReservationInput } from "@/lib/validations/reservation";
import { findConflict, formatConflictMessage, findSmartAlternatives } from "@/lib/booking-engine";
import { ResourceStatus, ReservationStatus, Role } from "@prisma/client";
import { formatGroupBookingTags } from "@/lib/group-booking";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // In background workers or CLI scripts, static generation store is not present
  }
}

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

      // 2. Query for overlapping CONFIRMED or PENDING reservations
      const conflict = await findConflict(tx, {
        resourceId: validatedData.resourceId,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
      });

      if (conflict) {
        throw new Error(formatConflictMessage(conflict));
      }

      const autoRelease = (validatedData as any).autoRelease !== false;
      const isPrivate = Boolean(validatedData.isPrivate);

      const tags: string[] = [];
      if (autoRelease) tags.push("[AUTO_RELEASE_ENABLED]");
      else tags.push("[AUTO_RELEASE_DISABLED]");
      if (isPrivate) tags.push("[PRIVATE]");

      // Support booking on behalf of another user (Admin privilege)
      let bookingUserId = user.id;
      if (validatedData.userId && validatedData.userId !== user.id) {
        if (user.role !== Role.ADMIN) {
          throw new Error("Only administrators can create reservations on behalf of other users.");
        }
        const targetUser = await tx.user.findUnique({
          where: { id: validatedData.userId },
        });
        if (!targetUser) {
          throw new Error("Specified user for reservation does not exist.");
        }
        bookingUserId = targetUser.id;
        tags.push(`[BOOKED_BY_ADMIN:${user.name || "Administrator"}]`);
      }

      // Group Booking: Check resource support & capacity
      if (validatedData.invitedUserIds && validatedData.invitedUserIds.length > 0) {
        const resourceAttrs = (resource.attributes as any) || {};
        const supportsGroup = resourceAttrs.allowGroupBooking !== false;
        const maxCap =
          typeof resourceAttrs.maxGroupCapacity === "number"
            ? resourceAttrs.maxGroupCapacity
            : (resource.capacity || 10);

        if (!supportsGroup) {
          throw new Error(
            `This resource (${resource.name}) is configured for individual use only and does not support group bookings.`
          );
        }
        if (1 + validatedData.invitedUserIds.length > maxCap) {
          throw new Error(
            `Exceeds maximum group capacity. This resource allows at most ${maxCap} people (including host).`
          );
        }

        const invitedUsers = await tx.user.findMany({
          where: {
            id: { in: validatedData.invitedUserIds },
            role: Role.USER, // Strictly normal users without admin
            NOT: { id: bookingUserId }, // Exclude creator
          },
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        });
        if (invitedUsers.length > 0) {
          const groupTags = formatGroupBookingTags(invitedUsers);
          if (groupTags) tags.push(groupTags);
        }
      }

      const userNotes = validatedData.notes?.trim() || "";
      const finalNotes = tags.length > 0 ? `${tags.join(" ")} ${userNotes}`.trim() : userNotes || null;

      // 3. Atomically create the reservation
      return await tx.reservation.create({
        data: {
          title: validatedData.title.trim(),
          notes: finalNotes,
          startTime: validatedData.startTime,
          endTime: validatedData.endTime,
          resourceId: validatedData.resourceId,
          userId: bookingUserId,
          status: ReservationStatus.CONFIRMED,
        },
        include: {
          resource: true,
          user: true,
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/my-reservations");
    revalidatePath("/reservations");
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

    // Guard: Past reservations cannot be edited
    if (new Date(existingReservation.endTime).getTime() <= Date.now()) {
      throw new Error("Past reservations cannot be edited or modified.");
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

      // 3. Update reservation (preserving internal system metadata tags while saving clean user notes)
      const existingTags: string[] = [];
      if (existingReservation.notes) {
        const tagRegex =
          /\[(AUTO_RELEASE_ENABLED|AUTO_RELEASE_DISABLED|CHECKED_IN:[^\]]+|AUTO_RELEASED[^\]]*|PRIVATE|BOOKED_BY_ADMIN:[^\]]+|CANCELLED_BY_ADMIN:[^\]]+|CANCELLED_BY_USER:[^\]]+|ADMIN_CANCEL_REASON:[^\]]+|USER_CANCEL_REASON:[^\]]+|REASON:[^\]]+|CANCEL_REASON:[^\]]+|GROUP_BOOKING|INVITED_USER:[^\]]+|GROUP_ATTENDEES:[^\]]+)\]/g;
        const matches = existingReservation.notes.match(tagRegex);
        if (matches) {
          existingTags.push(...matches);
        }
      }

      const updatedUserNotes = validatedData.notes?.trim() || "";
      const finalNotes =
        existingTags.length > 0
          ? `${existingTags.join(" ")} ${updatedUserNotes}`.trim()
          : updatedUserNotes || null;

      return await tx.reservation.update({
        where: { id },
        data: {
          title: validatedData.title.trim(),
          notes: finalNotes,
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
 * Story 4: Cancel reservation to immediately free up the slot.
 * If cancelled by an administrator for a team member, a justification reason is required and notified to the user.
 */
export async function cancelReservation(id: string, reason?: string) {
  try {
    const user = await requireAuth();
    if (!id) throw new Error("Reservation ID is required.");

    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
      include: { resource: true, user: true },
    });

    if (!existingReservation) {
      throw new Error("Reservation not found.");
    }

    // Role check: Only owner or ADMIN can cancel
    if (existingReservation.userId !== user.id && user.role !== "ADMIN") {
      throw new Error("You do not have permission to cancel this reservation.");
    }

    // Guard: Past reservations cannot be cancelled
    if (new Date(existingReservation.endTime).getTime() <= Date.now()) {
      throw new Error("Past reservations cannot be cancelled.");
    }

    const isAdminCancellingOther = user.role === "ADMIN" && existingReservation.userId !== user.id;

    if (isAdminCancellingOther && (!reason || !reason.trim())) {
      throw new Error("Please provide a reason when cancelling a user's reservation.");
    }

    const existingNotes = existingReservation.notes ? `${existingReservation.notes} ` : "";
    let updatedNotes = existingReservation.notes;

    if (isAdminCancellingOther) {
      const adminName = user.name || "Administrator";
      updatedNotes = `${existingNotes}[CANCELLED_BY_ADMIN:${adminName}] [REASON:${reason!.trim()}]`.trim();
    } else if (reason?.trim()) {
      updatedNotes = `${existingNotes}[CANCEL_REASON:${reason.trim()}]`.trim();
    }

    const cancelled = await prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        notes: updatedNotes,
      },
      include: { resource: true, user: true },
    });

    revalidatePath("/");
    revalidatePath("/admin");
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
 * Admin Action: Approve a pending private reservation
 */
export async function approveReservation(id: string, adminNotes?: string) {
  try {
    await requireAdmin();
    if (!id) throw new Error("Reservation ID is required.");

    const existing = await prisma.reservation.findUnique({
      where: { id },
      include: { resource: true, user: true },
    });

    if (!existing) {
      throw new Error("Reservation not found.");
    }

    if (existing.status === ReservationStatus.CONFIRMED) {
      throw new Error("Reservation is already confirmed.");
    }

    const existingNotes = existing.notes ? `${existing.notes} ` : "";
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CONFIRMED,
        notes: `${existingNotes}${adminNotes ? `[ADMIN: ${adminNotes.trim()}]` : ""}`.trim() || null,
      },
      include: { resource: true, user: true },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/resources");
    revalidatePath(`/resources/${updated.resourceId}`);
    revalidatePath("/reservations");
    revalidatePath("/my-reservations");

    return { success: true, reservation: updated };
  } catch (error: any) {
    console.error("Approve reservation error:", error);
    return {
      success: false,
      error: error?.message || "Failed to approve reservation.",
    };
  }
}

/**
 * Admin Action: Decline a pending private reservation, immediately freeing up the slot
 */
export async function declineReservation(id: string, adminNotes?: string) {
  try {
    await requireAdmin();
    if (!id) throw new Error("Reservation ID is required.");

    const existing = await prisma.reservation.findUnique({
      where: { id },
      include: { resource: true, user: true },
    });

    if (!existing) {
      throw new Error("Reservation not found.");
    }

    const existingNotes = existing.notes ? `${existing.notes} ` : "";
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        notes: `${existingNotes}[DECLINED] ${adminNotes ? `[REASON: ${adminNotes.trim()}]` : ""}`.trim(),
      },
      include: { resource: true, user: true },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/resources");
    revalidatePath(`/resources/${updated.resourceId}`);
    revalidatePath("/reservations");
    revalidatePath("/my-reservations");

    return { success: true, reservation: updated };
  } catch (error: any) {
    console.error("Decline reservation error:", error);
    return {
      success: false,
      error: error?.message || "Failed to decline reservation.",
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
      const suggestions = await findSmartAlternatives(prisma, {
        resourceId: params.resourceId,
        startTime: start,
        endTime: end,
        excludeReservationId: params.excludeReservationId,
      });

      return {
        hasConflict: true,
        message: formatConflictMessage(conflict),
        conflictingReservation: {
          title: conflict.title,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          organizer: conflict.user.name,
        },
        suggestions,
      };
    }

    return { hasConflict: false };
  } catch (error) {
    return { hasConflict: false };
  }
}

/**
 * Ghost Booking Prevention: Check In to an active reservation
 * Locks in the slot and guarantees the room won't be auto-released.
 */
export async function checkInReservation(id: string) {
  try {
    const user = await requireAuth();
    if (!id) throw new Error("Reservation ID is required.");

    const existing = await prisma.reservation.findUnique({
      where: { id },
      include: { resource: true },
    });

    if (!existing) {
      throw new Error("Reservation not found.");
    }

    if (existing.status !== ReservationStatus.CONFIRMED) {
      throw new Error(`Cannot check in to a ${existing.status.toLowerCase()} reservation.`);
    }

    // Role check: Only owner or ADMIN can check in
    if (existing.userId !== user.id && user.role !== Role.ADMIN) {
      throw new Error("Only the reservation organizer or an admin can check in.");
    }

    const checkInTimestamp = new Date().toISOString();
    const existingNotes = existing.notes ? `${existing.notes} ` : "";
    const updatedNotes = `${existingNotes}[CHECKED_IN:${checkInTimestamp}]`.trim();

    const updated = await prisma.reservation.update({
      where: { id },
      data: { notes: updatedNotes },
      include: { resource: true },
    });

    safeRevalidatePath("/");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/my-reservations");
    safeRevalidatePath("/reservations");
    safeRevalidatePath(`/resources/${existing.resourceId}`);

    return {
      success: true,
      message: `Checked in to ${existing.resource.name} successfully! Room secured.`,
      checkedInAt: checkInTimestamp,
      reservation: updated,
    };
  } catch (error: any) {
    console.error("Check-in error:", error);
    return {
      success: false,
      error: error?.message || "Failed to check in.",
    };
  }
}

/**
 * Ghost Booking Sweeper: Automatically releases slots where no check-in occurred within 15 minutes of start time
 */
export async function autoReleaseGhostBookings() {
  try {
    const now = new Date();
    // 15 minutes grace period
    const graceThreshold = new Date(now.getTime() - 15 * 60 * 1000);

    // Find all confirmed reservations whose start time is past the grace threshold,
    // whose end time hasn't expired, and which have not been checked in
    const candidates = await prisma.reservation.findMany({
      where: {
        status: ReservationStatus.CONFIRMED,
        startTime: { lte: graceThreshold },
        endTime: { gte: now },
      },
      include: {
        resource: true,
        user: true,
      },
    });

    const ghostBookings = candidates.filter((res) => {
      const notes = res.notes || "";
      const isCheckedIn = notes.includes("CHECKED_IN");
      const isAutoReleaseDisabled = notes.includes("AUTO_RELEASE_DISABLED");
      return !isCheckedIn && !isAutoReleaseDisabled;
    });

    const releasedIds: string[] = [];

    for (const ghost of ghostBookings) {
      const existingNotes = ghost.notes ? `${ghost.notes} ` : "";
      await prisma.reservation.update({
        where: { id: ghost.id },
        data: {
          status: ReservationStatus.CANCELLED,
          notes: `${existingNotes}[AUTO_RELEASED: Unattended ghost booking freed after 15-minute grace period]`.trim(),
        },
      });
      releasedIds.push(ghost.id);
    }

    if (releasedIds.length > 0) {
      safeRevalidatePath("/");
      safeRevalidatePath("/admin");
      safeRevalidatePath("/my-reservations");
      safeRevalidatePath("/reservations");
    }

    return {
      success: true,
      releasedCount: releasedIds.length,
      releasedIds,
      message:
        releasedIds.length > 0
          ? `Auto-released ${releasedIds.length} unattended ghost reservation(s). Slots returned to public pool.`
          : "All active reservations are checked-in or within the grace period. No ghost bookings detected.",
    };
  } catch (error: any) {
    console.error("Auto-release error:", error);
    return {
      success: false,
      error: error?.message || "Failed to execute auto-release sweeper.",
    };
  }
}

/**
 * Evaluator Simulator: Instantly triggers a simulated 15-min no-show auto-release on a reservation
 */
export async function simulateGhostRelease(id: string) {
  try {
    const user = await requireAuth();
    if (!id) throw new Error("Reservation ID is required.");

    const existing = await prisma.reservation.findUnique({
      where: { id },
      include: { resource: true },
    });

    if (!existing) throw new Error("Reservation not found.");

    if (existing.userId !== user.id && user.role !== Role.ADMIN) {
      throw new Error("You do not have permission to simulate release on this reservation.");
    }

    const existingNotes = existing.notes ? `${existing.notes} ` : "";
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        notes: `${existingNotes}[AUTO_RELEASED: Simulated 15-minute no-show release by evaluator]`.trim(),
      },
      include: { resource: true },
    });

    safeRevalidatePath("/");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/my-reservations");
    safeRevalidatePath("/reservations");
    safeRevalidatePath(`/resources/${existing.resourceId}`);

    return {
      success: true,
      message: `Simulated 15-minute no-show: "${existing.title}" at ${existing.resource.name} was auto-released! Slot is now free for colleagues to book.`,
      reservation: updated,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to simulate ghost release.",
    };
  }
}

/**
 * Story 4: Query active user's reservations
 */
export async function getMyReservations() {
  const user = await requireAuth();
  return await prisma.reservation.findMany({
    where: {
      OR: [
        { userId: user.id },
        { notes: { contains: `[INVITED_USER:${user.id}]` } },
      ],
    },
    orderBy: { startTime: "asc" },
    include: {
      resource: {
        include: { category: true },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          role: true,
          avatarUrl: true,
        },
      },
    },
  });
}

/**
 * Admin: Query all company reservations across all users
 */
export async function getAllReservations() {
  const user = await requireAdmin();
  return await prisma.reservation.findMany({
    orderBy: { startTime: "asc" },
    include: {
      resource: {
        include: { category: true },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          role: true,
          avatarUrl: true,
        },
      },
    },
  });
}

/**
 * Story 5: Query team schedule reservations
 * RBAC: Admin sees all reservations; non-admin users only see reservations related to them.
 */
export async function getTeamReservations() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === Role.ADMIN;

  return await prisma.reservation.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [
            { userId: user?.id || "__UNAUTHENTICATED__" },
            { notes: { contains: `[INVITED_USER:${user?.id || "__UNAUTHENTICATED__"}]` } },
          ],
        },
    orderBy: { startTime: "asc" },
    include: {
      resource: {
        include: { category: true },
      },
      user: true,
    },
  });
}

/**
 * Story 5: Query all team members for filtering
 */
export async function getTeamMembers() {
  return await prisma.user.findMany({
    orderBy: { name: "asc" },
  });
}

