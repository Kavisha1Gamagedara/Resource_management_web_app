/**
 * Calendar Integration Utilities for PrimeWave Lab Resource Hub
 * Supports:
 * 1. Direct Google Calendar Web URL generation (prefilled with UTC timestamps, location, title, notes)
 * 2. RFC 5545 standard compliant iCalendar (.ics) format generation (for Outlook, Apple Calendar, Thunderbird)
 * 3. Client-side instantaneous .ics file download trigger
 */

export interface CalendarEventData {
  id?: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: Date | string;
  endTime: Date | string;
}

/**
 * Format a Date object into UTC iCalendar timestamp: YYYYMMDDTHHMMSSZ
 */
export function formatToIcsDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Generates a direct Google Calendar pre-filled event link
 * Documentation: https://calendar.google.com/calendar/render
 */
export function generateGoogleCalendarUrl(event: CalendarEventData): string {
  const startStr = formatToIcsDate(event.startTime);
  const endStr = formatToIcsDate(event.endTime);

  const description = [
    event.description || "",
    "---",
    "Reserved via PrimeWave Lab Resource Management Hub",
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${startStr}/${endStr}`,
    details: description,
    location: event.location || "PrimeWave Lab Facility",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates valid RFC 5545 iCalendar content for Outlook, Apple Calendar, etc.
 */
export function generateIcsContent(event: CalendarEventData): string {
  const startStr = formatToIcsDate(event.startTime);
  const endStr = formatToIcsDate(event.endTime);
  const nowStr = formatToIcsDate(new Date());
  const uid = event.id
    ? `primewave-${event.id}@primewavelab.com`
    : `primewave-${Date.now()}@primewavelab.com`;

  // Escape special characters in text fields per RFC 5545 section 3.3.11
  const escapeIcs = (str?: string | null) =>
    (str || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");

  const description = [
    event.description || "",
    "Reserved via PrimeWave Lab Resource Management Hub",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PrimeWave Lab//Resource Reservation System//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(event.location || "PrimeWave Lab Facility")}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Client-side trigger to download an .ics file directly in the user's browser
 */
export function downloadIcsFile(event: CalendarEventData) {
  const icsContent = generateIcsContent(event);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeTitle = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  link.download = `${safeTitle || "reservation"}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
