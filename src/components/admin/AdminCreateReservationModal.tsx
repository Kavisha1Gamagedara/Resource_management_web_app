"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, setHours, setMinutes } from "date-fns";
import {
  X,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  User,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
} from "lucide-react";
import { createReservation, checkLiveConflict } from "@/lib/actions/reservations";

interface UserOption {
  id: string;
  name: string;
  email: string;
  department?: string | null;
  role?: string;
  avatarUrl?: string | null;
}

interface ResourceOption {
  id: string;
  name: string;
  location: string;
  category?: {
    name: string;
  } | null;
  attributes?: any;
}

interface AdminCreateReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  users: UserOption[];
  resources: ResourceOption[];
  initialResourceId?: string;
}

export function AdminCreateReservationModal({
  isOpen,
  onClose,
  onSuccess,
  users = [],
  resources = [],
  initialResourceId,
}: AdminCreateReservationModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || "");
  const [userSearch, setUserSearch] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState<string>(
    initialResourceId || resources[0]?.id || ""
  );
  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTimeStr, setStartTimeStr] = useState("09:00");
  const [endTimeStr, setEndTimeStr] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoRelease, setAutoRelease] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  // Initialize defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      if (users.length > 0 && !selectedUserId) {
        setSelectedUserId(users[0].id);
      }
      if (resources.length > 0 && !selectedResourceId) {
        setSelectedResourceId(initialResourceId || resources[0].id);
      }

      const now = new Date();
      if (now.getHours() >= 22) {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        setDateStr(format(tomorrow, "yyyy-MM-dd"));
        setStartTimeStr("09:00");
        setEndTimeStr("10:00");
      } else {
        const nextH = now.getHours() + 1;
        const nextEndH = Math.min(nextH + 1, 23);
        setDateStr(format(now, "yyyy-MM-dd"));
        setStartTimeStr(`${String(nextH).padStart(2, "0")}:00`);
        setEndTimeStr(`${String(nextEndH).padStart(2, "0")}:00`);
      }

      setTitle("");
      setNotes("");
      setIsPrivate(false);
      setAutoRelease(true);
      setConflictWarning(null);
      setSubmitError(null);
      setSuccessBooking(null);
      setUserSearch("");
    }
  }, [isOpen, users, resources, initialResourceId]);

  // Filtered users for quick search
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q))
    );
  }, [users, userSearch]);

  const selectedUserObj = useMemo(() => {
    return users.find((u) => u.id === selectedUserId);
  }, [users, selectedUserId]);

  const selectedResourceObj = useMemo(() => {
    return resources.find((r) => r.id === selectedResourceId);
  }, [resources, selectedResourceId]);

  // Check if currently selected date/time is in the past
  const isSelectedTimePast = useMemo(() => {
    if (!dateStr || !startTimeStr) return false;
    const [sh, sm] = startTimeStr.split(":").map(Number);
    const start = setMinutes(setHours(new Date(`${dateStr}T00:00:00`), sh), sm);
    return start.getTime() < Date.now() - 60 * 1000;
  }, [dateStr, startTimeStr]);

  // Debounced Conflict Probing
  useEffect(() => {
    if (!isOpen || !selectedResourceId || !dateStr || !startTimeStr || !endTimeStr || successBooking) {
      return;
    }

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
      setConflictWarning(null);
      return;
    }

    setIsCheckingConflict(true);
    const timer = setTimeout(async () => {
      const res = await checkLiveConflict({
        resourceId: selectedResourceId,
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
  }, [isOpen, selectedResourceId, dateStr, startTimeStr, endTimeStr, successBooking]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (successBooking && onSuccess) {
      onSuccess();
    }
    setSuccessBooking(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedUserId) {
      setSubmitError("Please select a user to book this reservation for.");
      return;
    }

    if (!selectedResourceId) {
      setSubmitError("Please select a facility or equipment.");
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

    const [startH, startM] = startTimeStr.split(":").map(Number);
    const [endH, endM] = endTimeStr.split(":").map(Number);

    const baseDate = new Date(`${dateStr}T00:00:00`);
    const start = setMinutes(setHours(baseDate, startH), startM);
    const end = setMinutes(setHours(baseDate, endH), endM);

    setIsSubmitting(true);

    try {
      const result = await createReservation({
        resourceId: selectedResourceId,
        userId: selectedUserId,
        title: title.trim(),
        notes: notes.trim() || null,
        startTime: start,
        endTime: end,
        isPrivate,
        autoRelease,
      });

      setIsSubmitting(false);

      if (result.success && result.reservation) {
        setSuccessBooking({
          id: result.reservation.id,
          title: title.trim(),
          userName: selectedUserObj?.name || "Colleague",
          userEmail: selectedUserObj?.email || "",
          resourceName: selectedResourceObj?.name || "Facility",
          startTime: start,
          endTime: end,
        });
        if (onSuccess) onSuccess();
      } else {
        setSubmitError(result.error || "Reservation failed.");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err?.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-600 text-white shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {successBooking ? "Reservation Confirmed" : "Create Reservation for User"}
              </h3>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {successBooking
                ? "The booking has been registered under the employee's name."
                : "Admin privilege: Reserve corporate facilities on behalf of any team member upon request."}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Confirmation Screen */}
        {successBooking ? (
          <div className="py-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                Reservation Created Successfully!
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                The reservation has been locked in for <strong>{successBooking.userName}</strong> and synchronized across team schedules.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-left dark:border-zinc-800 dark:bg-zinc-800/50 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>Booked for: {successBooking.userName}</span>
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {format(successBooking.startTime, "EEE, MMM d, yyyy")}
                </span>
              </div>
              <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                {successBooking.title}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-teal-400" />
                  <span>{successBooking.resourceName}</span>
                </span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span>
                    {format(successBooking.startTime, "h:mm a")} – {format(successBooking.endTime, "h:mm a")}
                  </span>
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Normal Admin Reservation Form */
          <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
            {/* User Selector */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>Reserve On Behalf Of (Employee) *</span>
              </label>

              {users.length > 5 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search employee by name, email, or department..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-100 outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <select
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-500 shadow-sm"
              >
                {filteredUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) — {u.department || "General"} [{u.role}]
                  </option>
                ))}
              </select>

              {selectedUserObj && (
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2 pt-0.5">
                  <span>Selected: <strong>{selectedUserObj.name}</strong></span>
                  <span>•</span>
                  <span>Department: <strong>{selectedUserObj.department || "General"}</strong></span>
                </div>
              )}
            </div>

            {/* Facility / Equipment Selector */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Facility / Resource *</span>
              </label>
              <select
                required
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-500 shadow-sm"
              >
                {resources.map((res) => (
                  <option key={res.id} value={res.id}>
                    {res.name} ({res.category?.name || "Facility"}) — {res.location}
                  </option>
                ))}
              </select>
            </div>

            {/* Meeting Purpose / Title */}
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Meeting / Purpose Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Executive Strategy Session (for Sarah)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 shadow-sm"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Reservation Date *</span>
              </label>
              <input
                type="date"
                required
                value={dateStr}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-purple-500 [color-scheme:light] dark:[color-scheme:dark] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 shadow-sm"
              />
            </div>

            {/* Time Range */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Start Time *</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 font-mono text-xs [color-scheme:light] dark:[color-scheme:dark] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 outline-none focus:border-purple-500 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>End Time *</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 font-mono text-xs [color-scheme:light] dark:[color-scheme:dark] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 outline-none focus:border-purple-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Quick Durations */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: "30 min", mins: 30 },
                  { label: "1 hr", mins: 60 },
                  { label: "1.5 hrs", mins: 90 },
                  { label: "2 hrs", mins: 120 },
                  { label: "3 hrs", mins: 180 },
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

            {/* Conflict Warning */}
            {conflictWarning && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300 animate-in fade-in flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <span className="font-bold">Scheduling Conflict: </span>
                  <span>{conflictWarning}</span>
                </div>
              </div>
            )}

            {/* Available indicator */}
            {!conflictWarning && !isCheckingConflict && dateStr && !isSelectedTimePast && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Resource slot is available! No conflicts detected.</span>
              </div>
            )}

            {submitError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {submitError}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Admin Notes / User Request Context (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Booked per Slack request from Sarah Connor for client visit"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 shadow-sm"
              />
            </div>

            {/* Ghost Booking Guard */}
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/40">
              <input
                type="checkbox"
                id="adminAutoRelease"
                checked={autoRelease}
                onChange={(e) => setAutoRelease(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="adminAutoRelease" className="text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                  Auto-release slot if not checked in within 15 minutes of start time
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Protects facilities from unattended ghost reservations. The employee can check in via the web UI.
                </span>
              </label>
            </div>

            {/* Actions */}
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
                disabled={isSubmitting || Boolean(conflictWarning) || isSelectedTimePast}
                className={`flex items-center gap-2 rounded-xl px-5 py-2 font-semibold text-white shadow-sm transition-all ${
                  isSelectedTimePast
                    ? "bg-zinc-700/60 text-zinc-400 cursor-not-allowed border border-zinc-700"
                    : conflictWarning
                    ? "bg-rose-500/80 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-500 disabled:opacity-50 cursor-pointer"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Creating Booking...</span>
                  </>
                ) : isSelectedTimePast ? (
                  <span>Select Upcoming Time</span>
                ) : conflictWarning ? (
                  <span>Cannot Book (Conflict)</span>
                ) : (
                  <span>Confirm Booking for {selectedUserObj?.name?.split(" ")[0] || "User"}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
