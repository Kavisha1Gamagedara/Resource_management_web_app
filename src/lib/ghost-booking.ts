/**
 * Ghost Booking Prevention & Check-in Logic
 * Real-world problem: Someone reserves a conference room for 3 hours, meetings get cancelled,
 * nobody releases it, and the room sits empty while others are locked out.
 * 
 * Solution:
 * 1. Check-in window opens 15 mins before start time.
 * 2. If nobody checks in within 15 mins after start time, system auto-releases the slot back to the team.
 */

export interface ParsedCheckInStatus {
  isCheckedIn: boolean;
  checkedInAt: Date | null;
  isAutoReleased: boolean;
  autoReleaseEnabled: boolean;
  isPrivate: boolean;
  cleanNotes: string;
}

/**
 * Parses reservation notes or metadata tags to determine check-in and auto-release status
 */
export function parseCheckInStatus(notes?: string | null): ParsedCheckInStatus {
  if (!notes) {
    return {
      isCheckedIn: false,
      checkedInAt: null,
      isAutoReleased: false,
      autoReleaseEnabled: true,
      isPrivate: false,
      cleanNotes: "",
    };
  }

  const isAutoReleased = notes.includes("AUTO_RELEASED");
  const autoReleaseEnabled = !notes.includes("AUTO_RELEASE_DISABLED");
  const isPrivate = notes.includes("[PRIVATE]");

  // Format: CHECKED_IN:2026-10-15T10:02:15.000Z or [CHECKED_IN:2026-10-15T10:02:15.000Z]
  const match = notes.match(/CHECKED_IN:([^\s;\]]+)/);
  let checkedInAt: Date | null = null;
  let isCheckedIn = false;

  if (match && match[1]) {
    const d = new Date(match[1]);
    if (!isNaN(d.getTime())) {
      checkedInAt = d;
      isCheckedIn = true;
    }
  } else if (notes.includes("CHECKED_IN")) {
    isCheckedIn = true;
  }

  const cleanNotes = cleanUserNotes(notes);

  return {
    isCheckedIn,
    checkedInAt,
    isAutoReleased,
    autoReleaseEnabled,
    isPrivate,
    cleanNotes,
  };
}

/**
 * Strips all internal system metadata tags from reservation notes, returning
 * only the genuine human-written user note, or empty string if no user note exists.
 */
export function cleanUserNotes(notes?: string | null): string {
  if (!notes) return "";
  return notes
    .replace(/\[AUTO_RELEASE_ENABLED\]/g, "")
    .replace(/AUTO_RELEASE_ENABLED/g, "")
    .replace(/\[AUTO_RELEASE_DISABLED\]/g, "")
    .replace(/AUTO_RELEASE_DISABLED/g, "")
    .replace(/\[CHECKED_IN:[^\]]+\]/g, "")
    .replace(/CHECKED_IN:[^\s;]+/g, "")
    .replace(/\[AUTO_RELEASED[^\]]*\]/g, "")
    .replace(/AUTO_RELEASED[^\n;]*/g, "")
    .replace(/\[PRIVATE\]/g, "")
    .replace(/\[BOOKED_BY_ADMIN:[^\]]+\]/g, "")
    .replace(/\[CANCELLED_BY_ADMIN:[^\]]+\]/g, "")
    .replace(/\[CANCELLED_BY_USER:[^\]]+\]/g, "")
    .replace(/\[ADMIN_CANCEL_REASON:[^\]]+\]/g, "")
    .replace(/\[USER_CANCEL_REASON:[^\]]+\]/g, "")
    .replace(/\[REASON:[^\]]+\]/g, "")
    .replace(/\[CANCEL_REASON:[^\]]+\]/g, "")
    .replace(/\[GROUP_BOOKING\]/g, "")
    .replace(/\[INVITED_USER:[^\]]+\]/g, "")
    .replace(/\[GROUP_ATTENDEES:[^\]]+\]/g, "")
    .trim();
}

/**
 * Evaluates current time relative to reservation start time to determine check-in eligibility
 */
export function getCheckInEligibility(startTime: Date | string, endTime: Date | string) {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  const end = typeof endTime === "string" ? new Date(endTime) : endTime;
  const now = new Date();

  // Check-in opens 15 minutes prior to start
  const windowOpensAt = new Date(start.getTime() - 15 * 60 * 1000);
  // Grace period ends 15 minutes after start
  const gracePeriodEndsAt = new Date(start.getTime() + 15 * 60 * 1000);

  const isBeforeWindow = now < windowOpensAt;
  const isWithinWindow = now >= windowOpensAt && now <= end;
  const isPastGrace = now > gracePeriodEndsAt && now < end;
  const isExpired = now >= end;

  const minutesUntilStart = Math.round((start.getTime() - now.getTime()) / (60 * 1000));
  const minutesSinceStart = Math.round((now.getTime() - start.getTime()) / (60 * 1000));

  return {
    canCheckInNow: isWithinWindow,
    isBeforeWindow,
    isPastGrace,
    isExpired,
    windowOpensAt,
    gracePeriodEndsAt,
    minutesUntilStart,
    minutesSinceStart,
  };
}

export interface ParsedCancellationInfo {
  isCancelledByAdmin: boolean;
  cancelledBy?: string;
  reason?: string;
}

/**
 * Parses cancellation metadata to retrieve admin justifications and notification details for the employee
 */
export function parseCancellationReason(notes?: string | null): ParsedCancellationInfo {
  if (!notes) return { isCancelledByAdmin: false };

  const adminMatch = notes.match(/\[CANCELLED_BY_ADMIN:([^\]]+)\]/);
  const reasonMatch = notes.match(/\[REASON:([^\]]+)\]/);
  const cancelReasonMatch = notes.match(/\[CANCEL_REASON:([^\]]+)\]/);

  if (adminMatch) {
    return {
      isCancelledByAdmin: true,
      cancelledBy: adminMatch[1].trim(),
      reason: reasonMatch ? reasonMatch[1].trim() : undefined,
    };
  }

  if (reasonMatch) {
    return {
      isCancelledByAdmin: true,
      reason: reasonMatch[1].trim(),
    };
  }

  if (cancelReasonMatch) {
    return {
      isCancelledByAdmin: false,
      reason: cancelReasonMatch[1].trim(),
    };
  }

  return { isCancelledByAdmin: false };
}
