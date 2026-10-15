/**
 * Group Booking Utilities
 * Enables normal users to schedule group reservations with invited teammates.
 * Invited users automatically see the reservation on their dashboard with complete details.
 */

export interface GroupAttendee {
  id: string;
  name: string;
  email: string;
  department?: string | null;
}

export interface GroupBookingInfo {
  isGroupBooking: boolean;
  invitedUserIds: string[];
  attendees: GroupAttendee[];
  cleanNotes: string;
}

/**
 * Parses reservation notes for group booking metadata tags:
 * - [GROUP_BOOKING]
 * - [INVITED_USER:uuid]
 * - [GROUP_ATTENDEES:encoded_json]
 */
export function parseGroupBooking(notes?: string | null): GroupBookingInfo {
  if (!notes) {
    return {
      isGroupBooking: false,
      invitedUserIds: [],
      attendees: [],
      cleanNotes: "",
    };
  }

  const isGroup = notes.includes("[GROUP_BOOKING]") || notes.includes("[INVITED_USER:");

  // Extract all invited user IDs
  const idMatches = notes.matchAll(/\[INVITED_USER:([^\]]+)\]/g);
  const invitedUserIds: string[] = [];
  for (const match of idMatches) {
    if (match[1]) {
      invitedUserIds.push(match[1]);
    }
  }

  // Extract attendee metadata if present
  let attendees: GroupAttendee[] = [];
  const attendeesMatch = notes.match(/\[GROUP_ATTENDEES:([^\]]+)\]/);
  if (attendeesMatch && attendeesMatch[1]) {
    try {
      const decoded = decodeURIComponent(attendeesMatch[1]);
      attendees = JSON.parse(decoded);
    } catch {
      attendees = [];
    }
  }

  // Strip all group booking internal tags for user-facing display
  const cleanNotes = notes
    .replace(/\[GROUP_BOOKING\]/g, "")
    .replace(/\[INVITED_USER:[^\]]+\]/g, "")
    .replace(/\[GROUP_ATTENDEES:[^\]]+\]/g, "")
    .trim();

  return {
    isGroupBooking: isGroup,
    invitedUserIds,
    attendees,
    cleanNotes,
  };
}

/**
 * Generates group booking metadata tags for database storage in reservation notes
 */
export function formatGroupBookingTags(attendees: GroupAttendee[]): string {
  if (!attendees || attendees.length === 0) return "";

  const tags = ["[GROUP_BOOKING]"];
  for (const a of attendees) {
    tags.push(`[INVITED_USER:${a.id}]`);
  }

  const sanitizedAttendees = attendees.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    department: a.department || null,
  }));

  tags.push(`[GROUP_ATTENDEES:${encodeURIComponent(JSON.stringify(sanitizedAttendees))}]`);
  return tags.join(" ");
}
