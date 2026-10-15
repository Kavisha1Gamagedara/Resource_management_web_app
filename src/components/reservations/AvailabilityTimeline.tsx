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

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md space-y-5">
      {/* Date Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-emerald-400" />
          <div>
            <h4 className="text-base font-bold text-white">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </h4>
            <p className="text-xs text-slate-400">
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
        <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 text-sm text-center">
          ⚠️ This resource is currently inactive or undergoing maintenance. Bookings are temporarily paused.
        </div>
      ) : (
        <>
          {/* Buffer Information Notice */}
          {bufferMinutes > 0 && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs">
              <span className="text-base">🧹</span>
              <span>
                <strong>Mandatory Turnaround Buffer:</strong> This facility enforces an automatic {bufferMinutes}-minute cleaning and reset window following each reservation.
              </span>
            </div>
          )}

          {/* Visual Timeline Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-slate-400 px-1">
              <span>08:00 AM</span>
              <span>12:00 PM</span>
              <span>04:00 PM</span>
              <span>08:00 PM</span>
            </div>

            {/* Continuous timeline bar */}
            <div className="relative h-12 w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex">
              {/* Hour dividers */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 border-r border-slate-800/40 h-full relative group cursor-pointer hover:bg-emerald-500/10 transition-colors"
                  onClick={() => {
                    if (onSelectSlot) {
                      const start = new Date(selectedDate);
                      start.setHours(hour, 0, 0, 0);
                      const end = new Date(selectedDate);
                      end.setHours(hour + 1, 0, 0, 0);
                      onSelectSlot(start, end);
                    }
                  }}
                  title={`Click to book ${hour}:00 - ${hour + 1}:00`}
                />
              ))}

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
                      className="absolute top-1 bottom-1 rounded bg-rose-600/85 border border-rose-400/80 text-white px-2 py-0.5 text-xs flex items-center justify-between shadow-md overflow-hidden z-10 transition-all hover:bg-rose-500"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${Math.max(widthPercent, 3)}%`,
                      }}
                      title={`${res.title} (${formatTime(res.startTime)} - ${formatTime(res.endTime)}) by ${res.user.name}`}
                    >
                      <span className="truncate font-medium text-[11px] leading-tight">
                        {res.title}
                      </span>
                    </div>

                    {bufferMinutes > 0 && bufClampedEnd > bufClampedStart && (
                      <div
                        className="absolute top-1.5 bottom-1.5 rounded bg-amber-500/25 border border-dashed border-amber-400/80 text-amber-300 px-1 py-0.5 text-[10px] flex items-center justify-center font-medium overflow-hidden z-10 select-none shadow-sm"
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
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-950 border border-slate-700" />
                <span>Available Slot</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-600/85 border border-rose-400/80" />
                <span>Booked Reservation</span>
              </div>
              {bufferMinutes > 0 && (
                <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                  <span className="w-3 h-3 rounded bg-amber-500/25 border border-dashed border-amber-400/80" />
                  <span>🧹 {bufferMinutes}m Turnaround / Cleaning</span>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Agenda List for the day */}
          <div className="space-y-2 pt-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Scheduled Bookings for this Day
            </h5>
            {dayReservations.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
                No bookings scheduled for {format(selectedDate, "MMM d")}. All slots are available!
              </div>
            ) : (
              <div className="space-y-2">
                {dayReservations.map((res) => (
                  <div
                    key={res.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {res.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="text-emerald-400 font-medium">
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
                              <span className="text-amber-400/90 font-medium flex items-center gap-1">
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
