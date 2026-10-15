"use client";

import * as React from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ReservationSummary {
  id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  status: string;
  user: {
    id: string;
    name: string;
    email: string;
    department?: string | null;
    avatarUrl?: string | null;
  };
}

interface AvailabilityTimelineProps {
  reservations: ReservationSummary[];
  onSelectSlot?: (startTime: Date, endTime: Date) => void;
  resourceName?: string;
  isResourceActive?: boolean;
  bufferMinutes?: number;
}

export function AvailabilityTimeline({
  reservations,
  onSelectSlot,
  resourceName,
  isResourceActive = true,
  bufferMinutes = 0,
}: AvailabilityTimelineProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());

  // Hours displayed on the timeline: 8:00 AM to 8:00 PM (12 hours)
  const START_HOUR = 8;
  const END_HOUR = 20;
  const TOTAL_HOURS = END_HOUR - START_HOUR;

  const nextDay = () => setSelectedDate((d) => addDays(d, 1));
  const prevDay = () => setSelectedDate((d) => subDays(d, 1));
  const setToday = () => setSelectedDate(new Date());

  // Filter reservations for the selected date
  const dayReservations = React.useMemo(() => {
    return reservations.filter((r) => {
      if (r.status !== "CONFIRMED") return false;
      const start = new Date(r.startTime);
      const end = new Date(r.endTime);

      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      return start < dayEnd && end > dayStart;
    });
  }, [reservations, selectedDate]);

  // Hourly slots for quick booking
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  const formatHourLabel = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour}:00 ${period}`;
  };

  const formatShortHour = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour} ${period}`;
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur-md space-y-5">
      {/* Date Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/90 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dayReservations.length === 0
                ? "No reservations today · Full availability"
                : `${dayReservations.length} reservation(s) scheduled`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={setToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={prevDay} title="Previous day">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextDay} title="Next day">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isResourceActive ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/50 dark:text-amber-300 text-sm text-center">
          ⚠️ This resource is currently inactive or undergoing maintenance. Bookings are temporarily paused.
        </div>
      ) : (
        <>
          {/* Buffer Information Notice */}
          {bufferMinutes > 0 && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-300 text-xs">
              <span className="text-base">🧹</span>
              <span>
                <strong>Mandatory Turnaround Buffer:</strong> This facility enforces an automatic {bufferMinutes}-minute cleaning and reset window following each reservation.
              </span>
            </div>
          )}

          {/* Visual Timeline Bar */}
          <div className="space-y-2">
            {/* Hour Markers directly above timeline segments */}
            <div className="grid grid-cols-12 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 text-center select-none pb-1">
              {hours.map((hour) => (
                <div key={hour} className="truncate px-0.5">
                  <span className="hidden md:inline">{formatShortHour(hour)}</span>
                  <span className="md:hidden">{hour > 12 ? hour - 12 : hour}{hour >= 12 ? "p" : "a"}</span>
                </div>
              ))}
            </div>

            {/* Continuous timeline bar */}
            <div className="relative h-16 w-full bg-slate-100 rounded-xl border border-slate-200 dark:bg-slate-950/90 dark:border-slate-700/80 overflow-hidden flex shadow-inner">
              {/* Hour dividers & interactive hover indicators */}
              {hours.map((hour) => {
                const slotStart = new Date(selectedDate);
                slotStart.setHours(hour, 0, 0, 0);
                const slotEnd = new Date(selectedDate);
                slotEnd.setHours(hour + 1, 0, 0, 0);
                const isPast = slotEnd.getTime() <= Date.now();
                const isEven = hour % 2 === 0;

                if (isPast) {
                  return (
                    <div
                      key={hour}
                      className="flex-1 border-r border-slate-200 dark:border-slate-800/80 h-full relative cursor-not-allowed select-none transition-colors flex flex-col justify-between p-1.5 bg-slate-200/60 dark:bg-slate-950/90 opacity-60"
                      title={`Past time slot (${formatHourLabel(hour)}) - Bookings closed`}
                    >
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 line-through">
                        {hour > 12 ? hour - 12 : hour}{hour >= 12 ? "p" : "a"}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-600 font-medium">
                        Past
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={hour}
                    className={`flex-1 border-r border-slate-200 dark:border-slate-700/60 h-full relative group cursor-pointer transition-colors flex flex-col justify-between p-1.5 ${
                      isEven ? "bg-white/80 dark:bg-slate-900/40" : "bg-slate-50/80 dark:bg-slate-950/40"
                    } hover:bg-emerald-500/15`}
                    onClick={() => {
                      if (onSelectSlot) {
                        onSelectSlot(slotStart, slotEnd);
                      }
                    }}
                    title={`Click to reserve ${formatHourLabel(hour)} – ${formatHourLabel(hour + 1)}`}
                  >
                    <span className="text-[10px] font-mono text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 font-medium">
                      {hour > 12 ? hour - 12 : hour}{hour >= 12 ? "p" : "a"}
                    </span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      + Book
                    </span>
                  </div>
                );
              })}

              {/* Booked blocks overlays */}
              {dayReservations.map((res) => {
                const start = new Date(res.startTime);
                const end = new Date(res.endTime);

                // Calculate position relative to 08:00 - 20:00 (12 hours)
                const startHour = start.getHours() + start.getMinutes() / 60;
                const endHour = end.getHours() + end.getMinutes() / 60;

                const clampedStart = Math.max(START_HOUR, Math.min(END_HOUR, startHour));
                const clampedEnd = Math.max(START_HOUR, Math.min(END_HOUR, endHour));

                if (clampedEnd <= clampedStart) return null;

                const leftPercent = ((clampedStart - START_HOUR) / TOTAL_HOURS) * 100;
                const widthPercent = ((clampedEnd - clampedStart) / TOTAL_HOURS) * 100;

                // Turnaround Buffer calculation
                const bufStart = end;
                const bufEnd = new Date(end.getTime() + bufferMinutes * 60 * 1000);
                const bufStartHour = bufStart.getHours() + bufStart.getMinutes() / 60;
                const bufEndHour = bufEnd.getHours() + bufEnd.getMinutes() / 60;
                const bufClampedStart = Math.max(START_HOUR, Math.min(END_HOUR, bufStartHour));
                const bufClampedEnd = Math.max(START_HOUR, Math.min(END_HOUR, bufEndHour));
                const bufLeftPercent = ((bufClampedStart - START_HOUR) / TOTAL_HOURS) * 100;
                const bufWidthPercent = ((bufClampedEnd - bufClampedStart) / TOTAL_HOURS) * 100;

                return (
                  <React.Fragment key={res.id}>
                    <div
                      className="absolute top-1 bottom-1 rounded-lg bg-rose-500 border border-rose-400 text-white px-2 py-0.5 text-xs flex items-center justify-between shadow-xs overflow-hidden z-10 transition-all hover:bg-rose-600"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${Math.max(widthPercent, 3)}%`,
                      }}
                      title={`${res.title} (${formatTime(res.startTime)} - ${formatTime(res.endTime)}) by ${res.user.name}`}
                    >
                      <span className="truncate font-semibold text-[11px] leading-tight">
                        {res.title}
                      </span>
                    </div>

                    {bufferMinutes > 0 && bufClampedEnd > bufClampedStart && (
                      <div
                        className="absolute top-1.5 bottom-1.5 rounded-lg bg-amber-400/30 border border-dashed border-amber-500 text-amber-900 dark:text-amber-300 px-1 py-0.5 text-[10px] flex items-center justify-center font-medium overflow-hidden z-10 select-none shadow-xs"
                        style={{
                          left: `${bufLeftPercent}%`,
                          width: `${Math.max(bufWidthPercent, 2)}%`,
                        }}
                        title={`🧹 ${bufferMinutes}m Turnaround Buffer (Cleaning & Reset) following ${res.title}`}
                      >
                        <span className="truncate text-[10px]">🧹 {bufferMinutes}m</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Timeline Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700" />
                  <span className="text-slate-700 dark:text-slate-300">Available Slot</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500 border border-rose-400" />
                  <span className="text-rose-700 dark:text-rose-300 font-medium">Booked Reservation</span>
                </div>
                {bufferMinutes > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium">
                    <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-500/25 border border-dashed border-amber-400" />
                    <span>🧹 {bufferMinutes}m Turnaround Buffer</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Hover or click any slot to begin a booking
              </span>
            </div>
          </div>

          {/* Hourly Availability Slots Grid */}
          <div className="space-y-3 pt-4 border-t border-slate-200/90 dark:border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h5 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  Daily Time Slots Overview ({format(selectedDate, "EEE, MMM d")})
                </h5>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Click any <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Available</span> card to pre-fill reservation time
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {hours.map((hour) => {
                const slotStart = new Date(selectedDate);
                slotStart.setHours(hour, 0, 0, 0);
                const slotEnd = new Date(selectedDate);
                slotEnd.setHours(hour + 1, 0, 0, 0);
                const isPast = slotEnd.getTime() <= Date.now();

                if (isPast) {
                  return (
                    <div
                      key={hour}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-100/80 text-left opacity-40 cursor-not-allowed select-none flex flex-col justify-between min-h-[76px] dark:border-slate-800/60 dark:bg-slate-950/80"
                      title={`Past time slot (${formatHourLabel(hour)} – ${formatHourLabel(hour + 1)})`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono line-through">
                          {formatShortHour(hour)}
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 border border-slate-300 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800">
                          Past
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-600">
                        <span>Slot Closed</span>
                      </div>
                    </div>
                  );
                }

                // Check if slot overlaps with any confirmed reservation
                const bookedRes = dayReservations.find((r) => {
                  const rStart = new Date(r.startTime);
                  const rEnd = new Date(r.endTime);
                  return rStart < slotEnd && rEnd > slotStart;
                });

                // Check if slot overlaps with any turnaround buffer
                const bufferRes = !bookedRes && bufferMinutes > 0 ? dayReservations.find((r) => {
                  const rEnd = new Date(r.endTime);
                  const bufEnd = new Date(rEnd.getTime() + bufferMinutes * 60 * 1000);
                  return rEnd < slotEnd && bufEnd > slotStart;
                }) : null;

                const isBooked = Boolean(bookedRes);
                const isBuffer = Boolean(bufferRes);

                const startFormatted = formatHourLabel(hour);
                const endFormatted = formatHourLabel(hour + 1);

                if (isBooked && bookedRes) {
                  return (
                    <div
                      key={hour}
                      className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-left transition-all flex flex-col justify-between min-h-[76px] dark:border-rose-500/30 dark:bg-rose-950/20"
                      title={`Booked: ${bookedRes.title} (${formatTime(bookedRes.startTime)} - ${formatTime(bookedRes.endTime)})`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-rose-900 dark:text-rose-200 font-mono">
                          {formatShortHour(hour)}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 border border-rose-300 text-rose-800 uppercase dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300">
                          Booked
                        </span>
                      </div>
                      <div className="mt-1">
                        <div className="text-[11px] font-semibold text-rose-950 dark:text-rose-200 truncate">
                          {bookedRes.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {bookedRes.user?.name || "Team Member"}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isBuffer) {
                  return (
                    <div
                      key={hour}
                      className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-left flex flex-col justify-between min-h-[76px] dark:border-amber-500/30 dark:bg-amber-950/20"
                      title={`🧹 ${bufferMinutes}-minute turnaround cleaning & reset window`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 font-mono">
                          {formatShortHour(hour)}
                        </span>
                        <span className="text-xs">🧹</span>
                      </div>
                      <div className="mt-1">
                        <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                          {bufferMinutes}m Turnaround
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Cleaning & Reset
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => onSelectSlot && onSelectSlot(slotStart, slotEnd)}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/60 text-left transition-all duration-150 group cursor-pointer shadow-xs hover:shadow-sm dark:border-emerald-500/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 dark:hover:border-emerald-400 flex flex-col justify-between min-h-[76px]"
                    title={`Click to reserve ${startFormatted} – ${endFormatted}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300 font-mono">
                        {formatShortHour(hour)}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Available</span>
                      <span className="text-emerald-600 group-hover:text-emerald-700 dark:text-emerald-300 font-bold text-[10px] group-hover:translate-x-0.5 transition-transform">
                        + Book →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Agenda List for the day */}
          <div className="space-y-2 pt-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Scheduled Bookings for this Day
            </h5>
            {dayReservations.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-xs">
                No bookings scheduled for {format(selectedDate, "MMM d")}. All slots are available!
              </div>
            ) : (
              <div className="space-y-2">
                {dayReservations.map((res) => (
                  <div
                    key={res.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950/60 dark:border-slate-800/80 gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/40">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {res.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {formatTime(res.startTime)} – {formatTime(res.endTime)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {res.user.name} ({res.user.department || "Team Member"})
                          </span>
                          {bufferMinutes > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 dark:text-amber-400/90 font-medium flex items-center gap-1">
                                <span>🧹</span>
                                <span>{bufferMinutes}m buffer until {formatTime(new Date(new Date(res.endTime).getTime() + bufferMinutes * 60 * 1000))}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
