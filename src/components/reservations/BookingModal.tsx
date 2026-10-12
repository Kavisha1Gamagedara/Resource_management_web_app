"use client";

import React, { useState, useEffect } from "react";
import { format, setHours, setMinutes, parse } from "date-fns";
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
  FileText,
} from "lucide-react";
import { createReservation, checkLiveConflict } from "@/lib/actions/reservations";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: string;
  resourceName: string;
  initialStart?: Date;
  initialEnd?: Date;
  onSuccess?: () => void;
}

export function BookingModal({
  isOpen,
  onClose,
  resourceId,
  resourceName,
  initialStart,
  initialEnd,
  onSuccess,
}: BookingModalProps) {
  const { data: session } = useSession();

  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("10:00");
  const [endTimeStr, setEndTimeStr] = useState("11:00");
  const [notes, setNotes] = useState("");

  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize dates
  useEffect(() => {
    if (initialStart && initialEnd) {
      setDateStr(format(initialStart, "yyyy-MM-dd"));
      setStartTimeStr(format(initialStart, "HH:mm"));
      setEndTimeStr(format(initialEnd, "HH:mm"));
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
    setConflictWarning(null);
    setSubmitError(null);
  }, [initialStart, initialEnd, isOpen]);

  // Story 3: Debounced Live Conflict Probing
  useEffect(() => {
    if (!isOpen || !dateStr || !startTimeStr || !endTimeStr) return;

    const [startH, startM] = startTimeStr.split(":").map(Number);
    const [endH, endM] = endTimeStr.split(":").map(Number);

    const baseDate = new Date(`${dateStr}T00:00:00`);
    const start = setMinutes(setHours(baseDate, startH), startM);
    const end = setMinutes(setHours(baseDate, endH), endM);

    if (end <= start) {
      setConflictWarning("End time must be later than start time.");
      return;
    }

    if (start.getTime() < Date.now() - 60 * 1000) {
      setConflictWarning("Cannot reserve a slot in the past. Please select an upcoming date and time.");
      return;
    }

    setIsCheckingConflict(true);
    const timer = setTimeout(async () => {
      const res = await checkLiveConflict({
        resourceId,
        startTime: start,
        endTime: end,
      });
      setIsCheckingConflict(false);

      if (res.hasConflict && res.message) {
        setConflictWarning(res.message);
      } else {
        setConflictWarning(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, dateStr, startTimeStr, endTimeStr, resourceId]);

  if (!isOpen) return null;

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
        resourceId,
        title: title.trim(),
        notes: notes.trim() || null,
        startTime: start,
        endTime: end,
      });

      setIsSubmitting(false);

      if (result.success) {
        if (onSuccess) onSuccess();
        onClose();
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
              Reserve {resourceName}
            </h3>
            <p className="text-xs text-zinc-500">
              Fulfills Story 3: Immediate conflict feedback & atomic booking
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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

        {/* Live Conflict Warning Banner (Story 3 Flagship UI) */}
        {conflictWarning && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <span className="font-bold">Immediate Conflict Warning</span>
                <p className="mt-0.5 leading-relaxed">{conflictWarning}</p>
              </div>
            </div>
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
              placeholder="e.g. Sprint Planning, Client Presentation, Lab Testing"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Reservation Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="date"
                required
                min={format(new Date(), "yyyy-MM-dd")}
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-9 pr-3 text-zinc-900 focus:border-teal-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Start & End Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Start Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="time"
                  required
                  min={dateStr === format(new Date(), "yyyy-MM-dd") ? format(new Date(), "HH:mm") : undefined}
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-9 pr-3 text-zinc-900 focus:border-teal-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                End Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="time"
                  required
                  min={startTimeStr || undefined}
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-9 pr-3 text-zinc-900 focus:border-teal-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>

          {dateStr === format(new Date(), "yyyy-MM-dd") && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 -mt-1">
              <Clock className="h-3 w-3 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>
                Booking for today: Only future slots passing current time ({format(new Date(), "h:mm a")}) can be reserved.
              </span>
            </p>
          )}

          {/* Notes */}
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Notes / Special Equipment Request (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Any special setup requirements or agenda links..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || Boolean(conflictWarning) || !session}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 font-semibold text-white shadow-sm transition-all ${
                conflictWarning
                  ? "bg-rose-500/80 cursor-not-allowed"
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
              ) : (
                <span>Confirm Reservation ⚡</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
