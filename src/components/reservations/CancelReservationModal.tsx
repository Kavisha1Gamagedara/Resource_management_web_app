"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  X,
  Loader2,
  Calendar,
  Clock,
  Building2,
  User,
  ShieldAlert,
} from "lucide-react";
import { cancelReservation } from "@/lib/actions/reservations";
import { formatDate, formatTime } from "@/lib/utils";

interface CancelReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: {
    id: string;
    title: string;
    startTime: Date | string;
    endTime: Date | string;
    userId?: string;
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      department?: string | null;
    } | null;
    resource?: {
      name: string;
      location?: string;
    } | null;
  } | null;
  isAdmin: boolean;
  currentUserId?: string;
  onSuccess: (updatedReservation: any) => void;
}

const ADMIN_QUICK_REASONS = [
  "🔧 Urgent facility maintenance or technical repairs",
  "👑 Reallocated for high-priority executive leadership meeting",
  "🔄 Facility double-booking resolution / room reassignment",
  "⚠️ Required A/V equipment undergoing maintenance",
  "🏢 Company-wide all-hands / organizational event",
];

export function CancelReservationModal({
  isOpen,
  onClose,
  reservation,
  isAdmin,
  currentUserId,
  onSuccess,
}: CancelReservationModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, reservation]);

  if (!isOpen || !reservation) return null;

  const reservationUserId = reservation.userId || reservation.user?.id;
  const isCancellingOtherUser = isAdmin && Boolean(reservationUserId && currentUserId ? reservationUserId !== currentUserId : true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isCancellingOtherUser && !reason.trim()) {
      setError("Please provide a cancellation reason so the employee knows why their booking was cancelled.");
      return;
    }

    if (isCancellingOtherUser && reason.trim().length < 5) {
      setError("Please provide a slightly more descriptive reason (at least 5 characters).");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await cancelReservation(reservation.id, reason.trim() || undefined);
      setIsSubmitting(false);

      if (res.success && res.reservation) {
        onSuccess(res.reservation);
        onClose();
      } else {
        setError(res.error || "Failed to cancel reservation.");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || "An unexpected error occurred while cancelling.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Cancel Reservation
                </h3>
                {isCancellingOtherUser && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                    <ShieldAlert className="h-3 w-3" />
                    ADMIN ACTION
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                {isCancellingOtherUser
                  ? "A formal cancellation reason is required and will be sent to the user."
                  : "Free this timeslot immediately for your teammates."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Reservation Summary */}
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/50 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {reservation.title}
              </span>
              {reservation.resource && (
                <span className="inline-flex items-center gap-1 font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900 text-[11px]">
                  <Building2 className="h-3 w-3" />
                  {reservation.resource.name}
                </span>
              )}
            </div>

            {reservation.user && (
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <User className="h-3.5 w-3.5 text-purple-500" />
                <span>
                  Booked for:{" "}
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    {reservation.user.name}
                  </strong>{" "}
                  ({reservation.user.department || "General"} • {reservation.user.email})
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                {formatDate(reservation.startTime)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
              </span>
            </div>
          </div>

          {/* Cancellation Reason Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {isCancellingOtherUser ? (
                  <span>
                    Reason for Cancellation <span className="text-rose-500">*</span>
                  </span>
                ) : (
                  <span>Reason (Optional)</span>
                )}
              </label>
              {isCancellingOtherUser && (
                <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                  Sent to user
                </span>
              )}
            </div>

            {/* Quick Reason Templates for Admin */}
            {isCancellingOtherUser && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                  Quick Reason Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ADMIN_QUICK_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReason(preset)}
                      className="text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-2 py-1 text-zinc-700 dark:text-zinc-300 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 dark:hover:border-purple-700 transition-colors text-left cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              required={isCancellingOtherUser}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isCancellingOtherUser
                  ? "Enter the specific reason why this user's reservation is being cancelled..."
                  : "Optional note on why you are releasing this time slot..."
              }
              className="w-full rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 transition-all resize-none shadow-sm"
            />
            {isCancellingOtherUser && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                💡 This explanation will be displayed to <strong>{reservation.user?.name || "the user"}</strong> on their reservations dashboard so they are fully informed.
              </p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              Keep Reservation
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (isCancellingOtherUser && !reason.trim())}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-500 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>
                    {isCancellingOtherUser ? "Cancel & Send Reason to User" : "Confirm Cancellation"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
