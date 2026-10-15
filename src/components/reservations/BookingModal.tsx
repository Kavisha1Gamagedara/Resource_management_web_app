"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Users,
  Search,
  UserCheck,
} from "lucide-react";
import { createReservation, checkLiveConflict } from "@/lib/actions/reservations";
import { getInvitableUsers } from "@/lib/actions/users";
import { AddToCalendarActionGroup } from "./AddToCalendarButton";
import { cleanUserNotes } from "@/lib/ghost-booking";
import { toast } from "@/components/ui/toast";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: string;
  resourceName: string;
  resourceAttributes?: any;
  resourceCapacity?: number | null;
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
  resourceAttributes,
  resourceCapacity,
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

  // Group Booking State (Teammate Invites without Admin)
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<{
    id: string;
    name: string;
    email: string;
    department?: string | null;
  }[]>([]);
  const [invitableUsers, setInvitableUsers] = useState<{
    id: string;
    name: string;
    email: string;
    department?: string | null;
  }[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
    invitedAttendees?: { id: string; name: string; department?: string | null }[];
  } | null>(null);

  // Fetch available normal users for group booking
  useEffect(() => {
    if (isOpen) {
      getInvitableUsers()
        .then((users) => {
          if (users) setInvitableUsers(users);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Initialize dates
  useEffect(() => {
    setCurrentResourceId(resourceId);
    setCurrentResourceName(resourceName);

    const effectiveStart = initialStart || initialStartTime;
    const effectiveEnd = initialEnd || initialEndTime;

    // Ensure effectiveStart is not in the past
    const isPastStart = effectiveStart && effectiveStart.getTime() < Date.now() - 60 * 1000;

    if (effectiveStart && effectiveEnd && !isPastStart) {
      setDateStr(format(effectiveStart, "yyyy-MM-dd"));
      setStartTimeStr(format(effectiveStart, "HH:mm"));
      setEndTimeStr(format(effectiveEnd, "HH:mm"));
    } else {
      const now = new Date();
      if (now.getHours() >= 22) {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        setDateStr(format(tomorrow, "yyyy-MM-dd"));
        setStartTimeStr("09:00");
        setEndTimeStr("10:00");
      } else {
        const nextHour = now.getHours() + 1;
        const nextHourEnd = Math.min(nextHour + 1, 23);
        setDateStr(format(now, "yyyy-MM-dd"));
        setStartTimeStr(`${String(nextHour).padStart(2, "0")}:00`);
        setEndTimeStr(`${String(nextHourEnd).padStart(2, "0")}:00`);
      }
    }
    setTitle("");
    setNotes("");
    setIsPrivate(false);
    setAutoRelease(true);
    setIsGroupBooking(false);
    setSelectedAttendees([]);
    setUserSearchQuery("");
    setIsDropdownOpen(false);
    setConflictWarning(null);
    setSmartSuggestions(null);
    setSubmitError(null);
    setConfirmedBooking(null);
  }, [initialStart, initialEnd, initialStartTime, initialEndTime, isOpen, resourceId, resourceName]);

  // Group booking configuration and capacity thresholds
  const allowGroupBooking = resourceAttributes?.allowGroupBooking !== false;
  const maxPeopleAllowed =
    typeof resourceAttributes?.maxGroupCapacity === "number" && resourceAttributes.maxGroupCapacity > 0
      ? resourceAttributes.maxGroupCapacity
      : typeof resourceCapacity === "number" && resourceCapacity > 0
      ? resourceCapacity
      : 6;
  const isAtCapacity = selectedAttendees.length >= maxPeopleAllowed - 1;

  // Filter available normal users for group booking dropdown
  const filteredTeammates = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase();
    const selectedIds = new Set(selectedAttendees.map((a) => a.id));
    return invitableUsers.filter((u) => {
      if (selectedIds.has(u.id)) return false;
      if (!query) return true;
      return (
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.department && u.department.toLowerCase().includes(query))
      );
    });
  }, [invitableUsers, selectedAttendees, userSearchQuery]);

  // Check if currently selected date and time is in the past
  const isSelectedTimePast = useMemo(() => {
    if (!dateStr || !startTimeStr) return false;
    const [sh, sm] = startTimeStr.split(":").map(Number);
    const start = setMinutes(setHours(new Date(`${dateStr}T00:00:00`), sh), sm);
    return start.getTime() < Date.now() - 60 * 1000;
  }, [dateStr, startTimeStr]);

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
      // User requested: No need to show past time conflict warning banner; just block selection
      setConflictWarning(null);
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

    if (isSelectedTimePast) {
      setSubmitError("Please select an upcoming time slot.");
      return;
    }

    if (conflictWarning) {
      setSubmitError("Cannot reserve: Please resolve the scheduling conflict first.");
      return;
    }

    if (allowGroupBooking && selectedAttendees.length > maxPeopleAllowed - 1) {
      setSubmitError(
        `This resource permits a maximum of ${maxPeopleAllowed} people (including host). Please remove ${
          selectedAttendees.length - (maxPeopleAllowed - 1)
        } colleague(s).`
      );
      return;
    }

    const [startH, startM] = startTimeStr.split(":").map(Number);
    const [endH, endM] = endTimeStr.split(":").map(Number);

    const baseDate = new Date(`${dateStr}T00:00:00`);
    const start = setMinutes(setHours(baseDate, startH), startM);
    const end = setMinutes(setHours(baseDate, endH), endM);

    setIsSubmitting(true);

    try {
      const hasInvites = allowGroupBooking && selectedAttendees.length > 0;
      const result = await createReservation({
        resourceId: currentResourceId,
        title: title.trim(),
        notes: notes.trim() || null,
        startTime: start,
        endTime: end,
        isPrivate,
        autoRelease,
        invitedUserIds: hasInvites ? selectedAttendees.map((a) => a.id) : undefined,
      });

      setIsSubmitting(false);

      if (result.success && result.reservation) {
        toast.success(`Reservation "${title.trim()}" booked successfully!`);
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
          invitedAttendees: hasInvites ? selectedAttendees : [],
        });
      } else {
        const errorMsg = result.error || "Reservation failed.";
        toast.error(errorMsg);
        setSubmitError(errorMsg);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      const errorMsg = err?.message || "An unexpected error occurred.";
      toast.error(errorMsg);
      setSubmitError(errorMsg);
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
              {cleanUserNotes(confirmedBooking.notes) && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                  Notes: &quot;{cleanUserNotes(confirmedBooking.notes)}&quot;
                </p>
              )}

              {confirmedBooking.invitedAttendees && confirmedBooking.invitedAttendees.length > 0 && (
                <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    <Users className="h-3.5 w-3.5" />
                    <span>Invited Teammates ({confirmedBooking.invitedAttendees.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {confirmedBooking.invitedAttendees.map((att) => (
                      <span
                        key={att.id}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800"
                      >
                        {att.name} {att.department ? `(${att.department})` : ""}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    This reservation has been added to their personal dashboards.
                  </p>
                </div>
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
            {!conflictWarning && !isCheckingConflict && dateStr && !isSelectedTimePast && (
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
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-teal-500 [color-scheme:light] dark:[color-scheme:dark] dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {/* Time Range */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Start Time *</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={startTimeStr}
                      onChange={(e) => setStartTimeStr(e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:border-teal-500 font-mono text-xs [color-scheme:light] dark:[color-scheme:dark] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>End Time *</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={endTimeStr}
                      onChange={(e) => setEndTimeStr(e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:border-teal-500 font-mono text-xs [color-scheme:light] dark:[color-scheme:dark] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 shadow-sm"
                    />
                  </div>
                </div>

                {/* Quick Duration Shortcuts */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">Quick Duration:</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Auto-adjusts end time</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "30 min", mins: 30 },
                      { label: "1 hr", mins: 60 },
                      { label: "1.5 hrs", mins: 90 },
                      { label: "2 hrs", mins: 120 },
                      { label: "3 hrs", mins: 180 },
                      { label: "Half Day (4h)", mins: 240 },
                    ].map((dur) => (
                      <button
                        key={dur.label}
                        type="button"
                        onClick={() => {
                          const [sh, sm] = startTimeStr.split(":").map(Number);
                          const totalMins = sh * 60 + sm + dur.mins;
                          const endH = Math.min(Math.floor(totalMins / 60), 23);
                          const endM = totalMins % 60;
                          setEndTimeStr(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700/60 transition-colors cursor-pointer"
                      >
                        {dur.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Standard Slot Presets */}
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Common Time Slots:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "9:00 - 10:00 AM", s: "09:00", e: "10:00" },
                      { label: "10:00 - 11:00 AM", s: "10:00", e: "11:00" },
                      { label: "11:00 - 12:00 PM", s: "11:00", e: "12:00" },
                      { label: "1:00 - 2:00 PM", s: "13:00", e: "14:00" },
                      { label: "2:00 - 3:00 PM", s: "14:00", e: "15:00" },
                      { label: "3:00 - 4:00 PM", s: "15:00", e: "16:00" },
                      { label: "4:00 - 5:00 PM", s: "16:00", e: "17:00" },
                    ].map((preset) => {
                      const todayStr = format(new Date(), "yyyy-MM-dd");
                      const isToday = dateStr === todayStr;
                      let isPresetPast = false;
                      if (isToday) {
                        const [eh, em] = preset.e.split(":").map(Number);
                        const presetEnd = setMinutes(setHours(new Date(`${dateStr}T00:00:00`), eh), em);
                        isPresetPast = presetEnd.getTime() <= Date.now();
                      }

                      return (
                        <button
                          key={preset.label}
                          type="button"
                          disabled={isPresetPast}
                          onClick={() => {
                            if (!isPresetPast) {
                              setStartTimeStr(preset.s);
                              setEndTimeStr(preset.e);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                            isPresetPast
                              ? "opacity-40 cursor-not-allowed line-through bg-slate-100 border border-slate-200 text-slate-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500"
                              : startTimeStr === preset.s && endTimeStr === preset.e
                              ? "bg-teal-50 text-teal-800 border border-teal-500 font-bold dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/50 cursor-pointer"
                              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700/40 cursor-pointer shadow-2xs"
                          }`}
                          title={isPresetPast ? "Past time slot (unavailable)" : `Select ${preset.label}`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
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

              {/* Story: Group Booking (Invite Colleagues) */}
              <div className="rounded-2xl border border-zinc-200 bg-slate-50/70 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👥</span>
                    <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                      Invite Colleagues (Group Booking)
                    </label>
                  </div>
                  {allowGroupBooking ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 font-mono">
                      Max {maxPeopleAllowed} people ({selectedAttendees.length + 1} / {maxPeopleAllowed})
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      Single-User Only
                    </span>
                  )}
                </div>

                {!allowGroupBooking ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Individual Resource</span>
                      <span className="text-[11px] text-amber-700 dark:text-amber-300">
                        This resource is designated for individual use only and does not support group bookings or colleague invitations.
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Search and invite normal users. This booking will automatically appear on their personal dashboard schedule.
                    </p>

                    {/* Selected Attendees Chips */}
                    {selectedAttendees.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                          <span>Invited Colleagues ({selectedAttendees.length}):</span>
                          <button
                            type="button"
                            onClick={() => setSelectedAttendees([])}
                            className="text-rose-500 hover:text-rose-600 text-[10px] cursor-pointer"
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedAttendees.map((attendee) => (
                            <span
                              key={attendee.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-900 dark:bg-indigo-950/70 dark:border-indigo-800 dark:text-indigo-200 shadow-2xs"
                            >
                              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
                                {attendee.name.charAt(0).toUpperCase()}
                              </span>
                              <span>{attendee.name}</span>
                              {attendee.department && (
                                <span className="text-[10px] opacity-75">({attendee.department})</span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedAttendees((prev) => prev.filter((a) => a.id !== attendee.id))
                                }
                                className="rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 cursor-pointer"
                                title={`Remove ${attendee.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Teammate Search Input with Dropdown (if not at capacity) */}
                    {!isAtCapacity ? (
                      <div className="relative pt-1">
                        <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Search Colleagues to Add:
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                          <input
                            type="text"
                            value={userSearchQuery}
                            onFocus={() => setIsDropdownOpen(true)}
                            onChange={(e) => {
                              setUserSearchQuery(e.target.value);
                              setIsDropdownOpen(true);
                            }}
                            placeholder="Click or type colleague name, email, or department..."
                            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-8 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 shadow-2xs cursor-pointer"
                          />
                          {userSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setUserSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                          <div
                            className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800 animate-in fade-in duration-150"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {filteredTeammates.length === 0 ? (
                              <div className="p-3 text-center text-xs text-zinc-500">
                                {userSearchQuery ? "No matching colleagues found." : "All eligible colleagues are already invited."}
                              </div>
                            ) : (
                              filteredTeammates.map((u) => (
                                <div
                                  key={u.id}
                                  onClick={() => {
                                    if (selectedAttendees.length >= maxPeopleAllowed - 1) return;
                                    setSelectedAttendees((prev) => [...prev, u]);
                                    setUserSearchQuery("");
                                    if (filteredTeammates.length <= 1) setIsDropdownOpen(false);
                                  }}
                                  className="flex items-center justify-between p-2 rounded-xl hover:bg-teal-50/70 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors text-xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                      {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block truncate">
                                        {u.name}
                                      </span>
                                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                                        {u.email}
                                      </span>
                                    </div>
                                  </div>
                                  {u.department && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0 ml-2">
                                      {u.department}
                                    </span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/50 text-xs text-teal-800 dark:text-teal-300 text-center font-medium">
                        Maximum group capacity of {maxPeopleAllowed} people reached for this resource (including host).
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                      <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">
                        * Admin accounts are excluded. Only standard users can be invited.
                      </span>
                      {isDropdownOpen && (
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(false)}
                          className="text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold cursor-pointer text-xs"
                        >
                          Close list
                        </button>
                      )}
                    </div>
                  </>
                )}
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
                  disabled={isSubmitting || Boolean(conflictWarning) || !session || isSelectedTimePast}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2 font-semibold text-white shadow-sm transition-all ${
                    isSelectedTimePast
                      ? "bg-zinc-700/60 text-zinc-400 cursor-not-allowed border border-zinc-700"
                      : conflictWarning
                      ? "bg-rose-500/80 cursor-not-allowed"
                      : isPrivate && session?.user?.role !== "ADMIN"
                      ? "bg-amber-600 hover:bg-amber-500 disabled:opacity-50 cursor-pointer"
                      : "bg-teal-600 hover:bg-teal-500 disabled:opacity-50 cursor-pointer"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Reserving...</span>
                    </>
                  ) : isSelectedTimePast ? (
                    <span>Select an Upcoming Time</span>
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
