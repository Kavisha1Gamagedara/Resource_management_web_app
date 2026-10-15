"use client";

import React, { useState, useEffect } from "react";
import { format, setHours, setMinutes } from "date-fns";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  X,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { createReservation, checkLiveConflict } from "@/lib/actions/reservations";
import { AddToCalendarActionGroup } from "./AddToCalendarButton";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: string;
  resourceName: string;
  initialStart?: Date;
  initialEnd?: Date;
  initialStartTime?: Date;
  initialEndTime?: Date;
  onSuccess?: () => void;
}

export function BookingModal({
  isOpen,
  onClose,
  resourceId,
  resourceName,
  initialStart,
  initialEnd,
  initialStartTime,
  initialEndTime,
  onSuccess,
}: BookingModalProps) {
  const { data: session } = useSession();

  const [currentResourceId, setCurrentResourceId] = useState(resourceId);
  const [currentResourceName, setCurrentResourceName] = useState(resourceName);

  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("10:00");
  const [endTimeStr, setEndTimeStr] = useState("11:00");
  const [notes, setNotes] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoRelease, setAutoRelease] = useState(true);

  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<{
    nextAvailableSlot?: {
      startTime: string;
      endTime: string;
      display: string;
      startHHMM: string;
      endHHMM: string;
    } | null;
    alternativeResource?: {
      id: string;
      name: string;
      location: string;
      capacity: number | null;
      categoryName: string;
    } | null;
  } | null>(null);

  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Confirmed booking state for 1-Click Calendar confirmation screen
  const [confirmedBooking, setConfirmedBooking] = useState<{
    id?: string;
    title: string;
    resourceName: string;
    startTime: Date;
    endTime: Date;
    notes?: string | null;
    autoRelease?: boolean;
  } | null>(null);

  // Initialize dates
  useEffect(() => {
    setCurrentResourceId(resourceId);
    setCurrentResourceName(resourceName);

    const effectiveStart = initialStart || initialStartTime;
    const effectiveEnd = initialEnd || initialEndTime;

    if (effectiveStart && effectiveEnd) {
      setDateStr(format(effectiveStart, "yyyy-MM-dd"));
      setStartTimeStr(format(effectiveStart, "HH:mm"));
      setEndTimeStr(format(effectiveEnd, "HH:mm"));
    } else {
      const now = new Date();
      const nextHour = Math.min(now.getHours() + 1, 22);
      const nextHourEnd = Math.min(nextHour + 1, 23);
      setDateStr(format(now, "yyyy-MM-dd"));
      setStartTimeStr(`${String(nextHour).padStart(2, "0")}:00`);
      setEndTimeStr(`${String(nextHourEnd).padStart(2, "0")}:00`);
    }
    setTitle("");
    setNotes("");
    setIsPrivate(false);
    setAutoRelease(true);
    setConflictWarning(null);
    setSmartSuggestions(null);
    setSubmitError(null);
    setConfirmedBooking(null);
  }, [initialStart, initialEnd, initialStartTime, initialEndTime, isOpen, resourceId, resourceName]);

  // Story 3: Debounced Live Conflict Probing with Smart Recommendations
  useEffect(() => {
    if (!isOpen || !dateStr || !startTimeStr || !endTimeStr || confirmedBooking) return;

    const [startH, startM] = startTimeStr.split(":").map(Number);
    const [endH, endM] = endTimeStr.split(":").map(Number);

    const baseDate = new Date(`${dateStr}T00:00:00`);
    const start = setMinutes(setHours(baseDate, startH), startM);
    const end = setMinutes(setHours(baseDate, endH), endM);

    if (end <= start) {
      setConflictWarning("End time must be later than start time.");
      setSmartSuggestions(null);
      return;
    }

    if (start.getTime() < Date.now() - 60 * 1000) {
      setConflictWarning("Cannot reserve a slot in the past. Please select an upcoming date and time.");
      setSmartSuggestions(null);
      return;
    }

    setIsCheckingConflict(true);
    const timer = setTimeout(async () => {
      const res = await checkLiveConflict({
        resourceId: currentResourceId,
        startTime: start,
        endTime: end,
      });
      setIsCheckingConflict(false);

      if (res.hasConflict && res.message) {
        setConflictWarning(res.message);
        setSmartSuggestions((res as any).suggestions || null);
      } else {
        setConflictWarning(null);
        setSmartSuggestions(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, dateStr, startTimeStr, endTimeStr, currentResourceId, confirmedBooking]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (confirmedBooking && onSuccess) {
      onSuccess();
    }
    setConfirmedBooking(null);
    onClose();
  };

  const handleApplySlot = (slot: { startHHMM: string; endHHMM: string }) => {
    setStartTimeStr(slot.startHHMM);
    setEndTimeStr(slot.endHHMM);
    setConflictWarning(null);
    setSmartSuggestions(null);
  };

  const handleSwitchResource = (alt: { id: string; name: string }) => {
    setCurrentResourceId(alt.id);
    setCurrentResourceName(alt.name);
    setConflictWarning(null);
    setSmartSuggestions(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!session) {
      setSubmitError("Please sign in to reserve this resource.");
      return;
    }

    if (conflictWarning) {
      setSubmitError("Cannot reserve: Please resolve the scheduling conflict first.");
      return;
    }

    const [startH, startM] = startTimeStr.split(":").map(Number);
    const [endH, endM] = endTimeStr.split(":").map(Number);

    const baseDate = new Date(`${dateStr}T00:00:00`);
    const start = setMinutes(setHours(baseDate, startH), startM);
    const end = setMinutes(setHours(baseDate, endH), endM);

    setIsSubmitting(true);

    try {
      const result = await createReservation({
        resourceId: currentResourceId,
        title: title.trim(),
        notes: notes.trim() || null,
        startTime: start,
        endTime: end,
        isPrivate,
        autoRelease,
      });

      setIsSubmitting(false);

      if (result.success && result.reservation) {
        if (onSuccess) onSuccess();
        // Transition directly to 1-Click "Add to Calendar" confirmation view
        setConfirmedBooking({
          id: result.reservation.id,
          title: title.trim(),
          resourceName: currentResourceName,
          startTime: start,
          endTime: end,
          notes: notes.trim() || null,
          autoRelease,
        });
      } else {
        setSubmitError(result.error || "Reservation failed.");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err?.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {confirmedBooking ? "Booking Confirmation" : `Reserve ${currentResourceName}`}
            </h3>
            <p className="text-xs text-zinc-500">
              {confirmedBooking
                ? "Your booking is locked in. Add it to your calendar below."
                : "Real-time conflict detection & atomic reservation engine"}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Confirmation Screen with 1-Click "Add to Calendar" (Feature 2) */}
        {confirmedBooking ? (
          <div className="py-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                Reservation Confirmed!
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Your reservation has been created in PostgreSQL and synchronized across team schedules.
              </p>
            </div>

            {/* Booking Details Summary Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-left dark:border-zinc-800 dark:bg-zinc-800/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {confirmedBooking.resourceName}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {format(confirmedBooking.startTime, "EEE, MMM d, yyyy")}
                </span>
              </div>
              <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                {confirmedBooking.title}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                <span>
                  {format(confirmedBooking.startTime, "h:mm a")} – {format(confirmedBooking.endTime, "h:mm a")}
                </span>
              </div>
              {confirmedBooking.notes && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                  Notes: &quot;{confirmedBooking.notes}&quot;
                </p>
              )}
            </div>

            {/* 1-Click "Add to Calendar" Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Sync to Your Calendar:</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-normal">
                  RFC 5545 & Google Cal
                </span>
              </div>

              {confirmedBooking.autoRelease && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-300">
                  <span>👻</span>
                  <span>
                    <strong>Ghost Booking Guard Active:</strong> Remember to click <em>[Check In]</em> within 15 minutes of start time on your reservations page to retain the room.
                  </span>
                </div>
              )}

              <AddToCalendarActionGroup
                event={{
                  id: confirmedBooking.id,
                  title: `${confirmedBooking.title} - ${confirmedBooking.resourceName}`,
                  description: confirmedBooking.notes,
                  location: confirmedBooking.resourceName,
                  startTime: confirmedBooking.startTime,
                  endTime: confirmedBooking.endTime,
                }}
              />
            </div>

            {/* Bottom Modal Actions */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
              <Link
                href="/my-reservations"
                onClick={handleClose}
                className="text-xs font-semibold text-teal-600 hover:text-teal-500 dark:text-teal-400 inline-flex items-center gap-1"
              >
                <span>View My Reservations</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Normal Form */
          <>
            {/* Auth prompt if not logged in */}
            {!session && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                <div className="flex items-center gap-2 font-semibold">
                  <Lock className="h-4 w-4" />
                  <span>Authentication Required</span>
                </div>
                <p className="mt-1">
                  You must sign in to confirm a reservation.
                </p>
                <Link
                  href="/login"
                  className="mt-3 inline-flex items-center gap-1 font-bold underline"
                >
                  <span>Sign in with 1-Click Demo Persona</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}

            {/* Live Conflict Warning Banner & Smart Suggestions (Story 3 + Smart Suggestions Flagship UI) */}
            {conflictWarning && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300 animate-in fade-in slide-in-from-top-1 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Immediate Conflict Warning</span>
                    <p className="mt-0.5 leading-relaxed">{conflictWarning}</p>
                  </div>
                </div>

                {/* Smart Suggestions Card */}
                {smartSuggestions && (smartSuggestions.nextAvailableSlot || smartSuggestions.alternativeResource) && (
                  <div className="mt-3 pt-3 border-t border-rose-200/80 dark:border-rose-900/60 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 text-[11px] uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                      <span>Smart Booking Recommendations</span>
                    </div>

                    {smartSuggestions.nextAvailableSlot && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                        <div>
                          <span className="font-bold block text-[11px] text-amber-700 dark:text-amber-300">
                            Next Available in {currentResourceName}:
                          </span>
                          <span className="text-xs font-semibold">
                            {smartSuggestions.nextAvailableSlot.display} today
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplySlot(smartSuggestions.nextAvailableSlot!)}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors shadow-sm self-start sm:self-auto cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Apply This Time</span>
                        </button>
                      </div>
                    )}

                    {smartSuggestions.alternativeResource && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-900 dark:text-teal-200">
                        <div>
                          <span className="font-bold block text-[11px] text-teal-700 dark:text-teal-300">
                            Free at this time in {smartSuggestions.alternativeResource.categoryName}:
                          </span>
                          <span className="text-xs font-semibold">
                            {smartSuggestions.alternativeResource.name} ({smartSuggestions.alternativeResource.location})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSwitchResource(smartSuggestions.alternativeResource!)}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors shadow-sm self-start sm:self-auto cursor-pointer flex items-center gap-1"
                        >
                          <ArrowRight className="h-3 w-3" />
                          <span>Switch Facility</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Success Slot Available Indicator */}
            {!conflictWarning && !isCheckingConflict && dateStr && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Time slot is currently available! No conflicts detected.</span>
              </div>
            )}

            {submitError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Meeting / Purpose Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Executive Strategy Session"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Reservation Date *
                </label>
                <input
                  type="date"
                  required
                  value={dateStr}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Notes / Agenda (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional equipment needed, catering, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {/* Private Reservation Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="isPrivate" className="text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  Mark as Private (Masks details from other team members)
                </label>
              </div>

              {/* Ghost Booking Auto-Release Guard Toggle */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/40">
                <input
                  type="checkbox"
                  id="autoRelease"
                  checked={autoRelease}
                  onChange={(e) => setAutoRelease(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="autoRelease" className="text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                      Auto-release slot if not checked in within 15 minutes of start time
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                      Anti-Ghosting
                    </span>
                  </div>
                  <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Prevents empty conference rooms. If nobody arrives and checks in via the UI within 15 minutes of start time, the slot is automatically freed for your teammates.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || Boolean(conflictWarning) || !session}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2 font-semibold text-white shadow-sm transition-all cursor-pointer ${
                    conflictWarning
                      ? "bg-rose-500/80 cursor-not-allowed"
                      : isPrivate && session?.user?.role !== "ADMIN"
                      ? "bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
                      : "bg-teal-600 hover:bg-teal-500 disabled:opacity-50"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Reserving...</span>
                    </>
                  ) : conflictWarning ? (
                    <span>Cannot Book (Conflict)</span>
                  ) : isPrivate && session?.user?.role !== "ADMIN" ? (
                    <span>Request Private Slot (Pending Approval)</span>
                  ) : (
                    <span>Confirm Reservation</span>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
