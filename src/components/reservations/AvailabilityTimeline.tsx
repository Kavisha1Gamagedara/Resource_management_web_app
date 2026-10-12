"use client";

import React, { useState } from "react";
import {
  format,
  addDays,
  subDays,
  isSameDay,
  startOfDay,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
} from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Plus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatTime, formatTimeRange } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { BookingModal } from "./BookingModal";

interface Reservation {
  id: string;
  title: string;
  notes?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  user?: {
    name: string;
    department?: string | null;
  } | null;
}

interface AvailabilityTimelineProps {
  resourceId: string;
  resourceName: string;
  isResourceActive: boolean;
  reservations: Reservation[];
}

export function AvailabilityTimeline({
  resourceId,
  resourceName,
  isResourceActive,
  reservations,
}: AvailabilityTimelineProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [prefilledSlot, setPrefilledSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  // Filter reservations for the currently selected day
  const dailyReservations = reservations
    .filter((r) => {
      if (r.status !== "CONFIRMED") return false;
      const rStart = new Date(r.startTime);
      const rEnd = new Date(r.endTime);
      return (
        isSameDay(rStart, selectedDate) ||
        isSameDay(rEnd, selectedDate) ||
        (isBefore(rStart, selectedDate) && isAfter(rEnd, selectedDate))
      );
    })
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

  // Working hours: 08:00 to 23:00 (15 hours from 8 AM to 10 PM start)
  const workHours = Array.from({ length: 15 }, (_, i) => i + 8);
  const isToday = isSameDay(selectedDate, new Date());
  const [showOnlyUpcoming, setShowOnlyUpcoming] = useState(false);

  const handlePrevDay = () => setSelectedDate((d) => subDays(d, 1));
  const handleNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const handleToday = () => {
    setSelectedDate(startOfDay(new Date()));
  };

  const handleSlotClick = (hour: number) => {
    if (!isResourceActive) return;
    const start = setMinutes(setHours(selectedDate, hour), 0);
    const end = setMinutes(setHours(selectedDate, hour + 1), 0);
    setPrefilledSlot({ start, end });
    setModalOpen(true);
  };

  const handleBookClick = () => {
    if (!isResourceActive) return;
    const now = new Date();
    const today = isSameDay(selectedDate, now);
    // If today, default to the next upcoming full hour strictly in the future
    const startHour = today ? Math.min(now.getHours() + 1, 22) : 9;
    const endHour = Math.min(startHour + 1, 23);
    const defaultStart = setMinutes(setHours(selectedDate, startHour), 0);
    const defaultEnd = setMinutes(setHours(selectedDate, endHour), 0);
    setPrefilledSlot({ start: defaultStart, end: defaultEnd });
    setModalOpen(true);
  };

  // Filter hours if user toggles upcoming slots only
  const displayedHours = workHours.filter((hour) => {
    if (showOnlyUpcoming && isToday) {
      const slotStart = setMinutes(setHours(selectedDate, hour), 0);
      return slotStart.getTime() > Date.now();
    }
    return true;
  });

  return (
    <div className="space-y-6 rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      {/* Header & Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Availability Schedule & Slots
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Fulfills Story 2: "As a user, I can see when a resource is booked"
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Navigator */}
          <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50/80 p-1 dark:border-zinc-800 dark:bg-zinc-950">
            <button
              onClick={handlePrevDay}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-800 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {format(selectedDate, "EEE, MMM d, yyyy")}
            </span>
            <button
              onClick={handleNextDay}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-800 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isToday
                ? "border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            Today
          </button>

          {isResourceActive && (
            <button
              onClick={handleBookClick}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Reserve Slot</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Timeline Bar (08:00 to 23:00) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Schedule Timeline (8:00 AM – 11:00 PM)
            </span>
            {isToday && (
              <button
                type="button"
                onClick={() => setShowOnlyUpcoming((prev) => !prev)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all border ${
                  showOnlyUpcoming
                    ? "border-teal-500 bg-teal-500 text-white shadow-xs"
                    : "border-zinc-200 bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {showOnlyUpcoming ? "✓ Showing Upcoming Only" : "Show Upcoming Only"}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Available Slot (Click to Book)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span>Booked Slot</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
              <span>Past / Elapsed</span>
            </span>
          </div>
        </div>

        {/* Visual Slots Grid */}
        {displayedHours.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800">
            <Clock className="mx-auto h-6 w-6 text-zinc-400" />
            <p className="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              All scheduled operational slots for today have elapsed.
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Switch to tomorrow to reserve upcoming slots or toggle off "Upcoming Only" to view today's history.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div
              className="grid gap-1.5 rounded-2xl bg-zinc-50 p-2.5 dark:bg-zinc-950/80 border border-zinc-200/60 dark:border-zinc-800"
              style={{
                gridTemplateColumns: `repeat(${displayedHours.length}, minmax(64px, 1fr))`,
                minWidth: displayedHours.length > 8 ? "680px" : "100%",
              }}
            >
              {displayedHours.map((hour) => {
                const slotStart = setMinutes(setHours(selectedDate, hour), 0);
                const slotEnd = setMinutes(setHours(selectedDate, hour + 1), 0);

                // Check if slot overlaps any confirmed reservation
                const isBooked = dailyReservations.some((r) => {
                  const rStart = new Date(r.startTime);
                  const rEnd = new Date(r.endTime);
                  return slotStart < rEnd && slotEnd > rStart;
                });

                // A slot is past if its start time has already elapsed
                const isPast = slotStart.getTime() <= Date.now();

                return (
                  <button
                    key={hour}
                    disabled={!isResourceActive || isBooked || isPast}
                    onClick={() => handleSlotClick(hour)}
                    className={`group relative flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition-all ${
                      !isResourceActive
                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-900"
                        : isPast
                        ? "bg-zinc-100/70 text-zinc-400 border border-zinc-200/50 cursor-not-allowed dark:bg-zinc-900/40 dark:text-zinc-600 dark:border-zinc-800"
                        : isBooked
                        ? "bg-rose-100 text-rose-800 border border-rose-200 cursor-not-allowed dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900"
                        : "bg-white text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 hover:shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 cursor-pointer"
                    }`}
                    title={
                      !isResourceActive
                        ? "Facility inactive"
                        : isPast
                        ? `Time has passed (${formatTime(slotStart)})`
                        : isBooked
                        ? `Booked (${formatTime(slotStart)})`
                        : `Click to reserve ${formatTime(slotStart)} – ${formatTime(slotEnd)}`
                    }
                  >
                    <span className="text-[10px] font-bold">
                      {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
                    </span>
                    <span className="mt-1 text-[9px] font-medium leading-none">
                      {isPast ? "Past" : isBooked ? "Booked" : "Free"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Daily Bookings Agenda List */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Scheduled Bookings for {format(selectedDate, "MMMM d, yyyy")}
        </h3>

        {dailyReservations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800">
            <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" />
            <p className="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              No bookings scheduled for this date.
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              The entire schedule is completely free and available.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200/80 bg-white overflow-hidden dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {dailyReservations.map((res) => (
              <div
                key={res.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {res.title}
                    </span>
                    <Badge variant="danger" size="sm">
                      Booked
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-zinc-400" />
                      <span>{res.user?.name || "Team Member"}</span>
                    </div>
                    {res.user?.department && (
                      <>
                        <span>•</span>
                        <span>{res.user.department}</span>
                      </>
                    )}
                    {res.notes && (
                      <>
                        <span>•</span>
                        <span className="italic">"{res.notes}"</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 shrink-0">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>
                    {formatTime(res.startTime)} – {formatTime(res.endTime)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        resourceId={resourceId}
        resourceName={resourceName}
        initialStart={prefilledSlot?.start}
        initialEnd={prefilledSlot?.end}
        onSuccess={() => {
          setModalOpen(false);
        }}
      />
    </div>
  );
}
