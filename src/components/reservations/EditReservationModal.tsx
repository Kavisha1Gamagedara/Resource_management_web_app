"use client";

import React, { useState, useEffect } from "react";
import { format, setHours, setMinutes } from "date-fns";
import { X, Clock, Calendar, AlertTriangle, Loader2 } from "lucide-react";
import { updateReservation } from "@/lib/actions/reservations";

interface EditReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: {
    id: string;
    title: string;
    notes?: string | null;
    startTime: Date | string;
    endTime: Date | string;
    resourceId: string;
    resource: {
      name: string;
    };
  } | null;
  onSuccess: (updated: any) => void;
}

export function EditReservationModal({
  isOpen,
  onClose,
  reservation,
  onSuccess,
}: EditReservationModalProps) {
  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("10:00");
  const [endTimeStr, setEndTimeStr] = useState("11:00");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reservation && isOpen) {
      setTitle(reservation.title);
      setNotes(reservation.notes || "");
      const start = new Date(reservation.startTime);
      const end = new Date(reservation.endTime);
      setDateStr(format(start, "yyyy-MM-dd"));
      setStartTimeStr(format(start, "HH:mm"));
      setEndTimeStr(format(end, "HH:mm"));
      setError(null);
    }
  }, [reservation, isOpen]);

  if (!isOpen || !reservation) return null;

  const isReservationPast = new Date(reservation.endTime).getTime() <= Date.now();

  if (isReservationPast) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Cannot Edit Past Reservation
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            This reservation has already concluded and is locked in the audit log. Completed or past reservations cannot be modified or rescheduled.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-5 py-2 text-xs font-semibold cursor-pointer hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isReservationPast) {
      setError("Past reservations cannot be edited.");
      return;
    }

    const [startH, startM] = startTimeStr.split(":").map(Number);
    const [endH, endM] = endTimeStr.split(":").map(Number);

    const baseDate = new Date(`${dateStr}T00:00:00`);
    const start = setMinutes(setHours(baseDate, startH), startM);
    const end = setMinutes(setHours(baseDate, endH), endM);

    if (end <= start) {
      setError("End time must be later than start time.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updateReservation(reservation.id, {
        resourceId: reservation.resourceId,
        title: title.trim(),
        notes: notes.trim() || null,
        startTime: start,
        endTime: end,
        isPrivate: false,
      });

      setIsSubmitting(false);

      if (res.success && res.reservation) {
        onSuccess(res.reservation);
        onClose();
      } else {
        setError(res.error || "Failed to update reservation.");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Edit Reservation Slot
            </h3>
            <p className="text-xs text-zinc-500">
              Reschedule &ldquo;{reservation.resource.name}&rdquo;
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

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

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 font-semibold text-white shadow-sm hover:bg-teal-500 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
