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
  Users,
  UserCheck,
} from "lucide-react";
import { createReservation, checkLiveConflict } from "@/lib/actions/reservations";
import { getInvitableUsers } from "@/lib/actions/users";
import { updateResource } from "@/lib/actions/resources";
import { toast } from "@/components/ui/toast";

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
    id?: string;
    name: string;
  } | null;
  categoryId?: string;
  capacity?: number | null;
  status?: any;
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

  // Group Booking & Capacity Configuration
  const [isGroupBooking, setIsGroupBooking] = useState(true);
  const [maxGroupCapacity, setMaxGroupCapacity] = useState<number>(6);
  const [saveResourceDefaults, setSaveResourceDefaults] = useState(true);
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
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState("");
  const [isAttendeeDropdownOpen, setIsAttendeeDropdownOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  // Fetch available normal users for group booking
  useEffect(() => {
    if (isOpen) {
      getInvitableUsers()
        .then((data) => {
          if (data) setInvitableUsers(data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

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
      setSelectedAttendees([]);
      setAttendeeSearchQuery("");
      setIsAttendeeDropdownOpen(false);
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

  // Synchronize resource group settings whenever selected resource changes
  useEffect(() => {
    if (selectedResourceObj) {
      const attrs = (selectedResourceObj.attributes as any) || {};
      const supports = attrs.allowGroupBooking !== false;
      setIsGroupBooking(supports);
      const cap =
        typeof attrs.maxGroupCapacity === "number"
          ? attrs.maxGroupCapacity
          : typeof selectedResourceObj.capacity === "number" && selectedResourceObj.capacity > 0
          ? selectedResourceObj.capacity
          : 6;
      setMaxGroupCapacity(cap);
    }
  }, [selectedResourceId, selectedResourceObj]);

  // Filter eligible colleagues to invite (excluding host user and already selected)
  const eligibleColleagues = useMemo(() => {
    return invitableUsers.filter(
      (u) => u.id !== selectedUserId && !selectedAttendees.some((sel) => sel.id === u.id)
    );
  }, [invitableUsers, selectedUserId, selectedAttendees]);

  const filteredColleagues = useMemo(() => {
    if (!attendeeSearchQuery.trim()) return eligibleColleagues;
    const q = attendeeSearchQuery.toLowerCase();
    return eligibleColleagues.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q))
    );
  }, [eligibleColleagues, attendeeSearchQuery]);

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

    if (isGroupBooking && selectedAttendees.length > maxGroupCapacity - 1) {
      setSubmitError(
        `Cannot invite more than ${maxGroupCapacity - 1} colleagues (Maximum capacity is ${maxGroupCapacity} people including host).`
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
      const result = await createReservation({
        resourceId: selectedResourceId,
        userId: selectedUserId,
        title: title.trim(),
        notes: notes.trim() || null,
        startTime: start,
        endTime: end,
        isPrivate,
        autoRelease,
        invitedUserIds: isGroupBooking ? selectedAttendees.map((a) => a.id) : [],
      });

      // Synchronize resource profile group settings if checked
      if (saveResourceDefaults && selectedResourceObj) {
        try {
          const curAttrs = (selectedResourceObj.attributes as any) || {};
          await updateResource(selectedResourceId, {
            name: selectedResourceObj.name,
            categoryId: selectedResourceObj.categoryId || (selectedResourceObj.category as any)?.id || "",
            location: selectedResourceObj.location,
            capacity: selectedResourceObj.capacity ?? null,
            status: selectedResourceObj.status,
            attributes: {
              ...curAttrs,
              allowGroupBooking: isGroupBooking,
              maxGroupCapacity: Number(maxGroupCapacity) || 6,
            },
          });
        } catch (syncErr) {
          console.warn("Could not synchronize resource attributes:", syncErr);
        }
      }

      setIsSubmitting(false);

      if (result.success && result.reservation) {
        toast.success(
          `Reservation created successfully for ${selectedUserObj?.name || "employee"}!`
        );
        setSuccessBooking({
          id: result.reservation.id,
          title: title.trim(),
          userName: selectedUserObj?.name || "Colleague",
          userEmail: selectedUserObj?.email || "",
          resourceName: selectedResourceObj?.name || "Facility",
          startTime: start,
          endTime: end,
          isGroupBooking,
          maxGroupCapacity,
          invitedAttendees: isGroupBooking ? [...selectedAttendees] : [],
        });
        if (onSuccess) onSuccess();
      } else {
        const errText = result.error || "Reservation failed.";
        toast.error(errText);
        setSubmitError(errText);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      const errText = err?.message || "An unexpected error occurred.";
      toast.error(errText);
      setSubmitError(errText);
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

              {successBooking.invitedAttendees && successBooking.invitedAttendees.length > 0 && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/60 text-xs">
                  <span className="font-semibold text-purple-600 dark:text-purple-400 block mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Group Booking ({successBooking.invitedAttendees.length + 1} attendees):</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-200 text-[11px] font-semibold">
                      Host: {successBooking.userName}
                    </span>
                    {successBooking.invitedAttendees.map((att: any) => (
                      <span
                        key={att.id}
                        className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 text-[11px] border border-zinc-200 dark:border-zinc-700"
                      >
                        {att.name} {att.department ? `(${att.department})` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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

            {/* Story: Group Booking & Capacity Configuration */}
            <div className="rounded-2xl border border-purple-200/80 bg-purple-50/60 p-4 space-y-3 dark:border-purple-900/50 dark:bg-purple-950/25">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-lg">👥</span>
                  <div>
                    <label
                      htmlFor="adminGroupBookingToggle"
                      className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block cursor-pointer"
                    >
                      Resource Supports Group Booking
                    </label>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Tick if this facility allows group reservations and colleague invitations.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="adminGroupBookingToggle"
                  checked={isGroupBooking}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsGroupBooking(checked);
                    if (!checked) {
                      setSelectedAttendees([]);
                    }
                  }}
                  className="mt-0.5 rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer h-4 w-4"
                />
              </div>

              {isGroupBooking ? (
                <div className="space-y-3 pt-3 border-t border-purple-200/70 dark:border-purple-900/40">
                  {/* Maximum People Input */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        Maximum People (Capacity):
                      </span>
                      <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
                        Total attendance including {selectedUserObj?.name?.split(" ")[0] || "host"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={2}
                        max={100}
                        value={maxGroupCapacity}
                        onChange={(e) => {
                          const val = Math.max(2, Math.min(100, Number(e.target.value) || 2));
                          setMaxGroupCapacity(val);
                          if (selectedAttendees.length > val - 1) {
                            setSelectedAttendees(selectedAttendees.slice(0, val - 1));
                          }
                        }}
                        className="w-20 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-800 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200 font-semibold text-center"
                      />
                      <span className="text-xs text-zinc-500">people max</span>
                    </div>
                  </div>

                  {/* Teammate Invites Search & Dropdown */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Invite Colleagues to this Reservation:
                      </span>
                      <span className="text-[11px] font-mono font-medium text-purple-700 dark:text-purple-300">
                        {selectedAttendees.length + 1} / {maxGroupCapacity} people
                      </span>
                    </div>

                    {/* Selected Attendees Chips */}
                    {selectedAttendees.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        {selectedAttendees.map((att) => (
                          <span
                            key={att.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-200 font-medium border border-purple-200 dark:border-purple-800/60"
                          >
                            <span>{att.name}</span>
                            {att.department && (
                              <span className="text-[10px] opacity-70">({att.department})</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedAttendees(selectedAttendees.filter((a) => a.id !== att.id))}
                              className="text-purple-700 dark:text-purple-300 hover:text-red-600 transition-colors cursor-pointer"
                              title="Remove colleague"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Search and Add Colleagues */}
                    {selectedAttendees.length < maxGroupCapacity - 1 ? (
                      <div className="relative">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                          <input
                            type="text"
                            placeholder="Search colleagues to invite (name, email, dept)..."
                            value={attendeeSearchQuery}
                            onFocus={() => setIsAttendeeDropdownOpen(true)}
                            onChange={(e) => {
                              setAttendeeSearchQuery(e.target.value);
                              setIsAttendeeDropdownOpen(true);
                            }}
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-500 bg-white shadow-xs"
                          />
                        </div>

                        {/* Dropdown */}
                        {isAttendeeDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900 z-30">
                            {filteredColleagues.length === 0 ? (
                              <div className="p-3 text-[11px] text-zinc-500 text-center">
                                No eligible colleagues found matching search.
                              </div>
                            ) : (
                              filteredColleagues.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAttendees([...selectedAttendees, user]);
                                    setAttendeeSearchQuery("");
                                    setIsAttendeeDropdownOpen(false);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 cursor-pointer"
                                >
                                  <div>
                                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                                      {user.name}
                                    </div>
                                    <div className="text-[10px] text-zinc-500">
                                      {user.email} {user.department ? `• ${user.department}` : ""}
                                    </div>
                                  </div>
                                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                                    + Invite
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 text-[11px] text-purple-800 dark:text-purple-300 font-medium text-center">
                        Maximum group capacity of {maxGroupCapacity} people reached (including host).
                      </div>
                    )}
                  </div>

                  {/* Save to Resource Profile Option */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="saveResourceDefaults"
                      checked={saveResourceDefaults}
                      onChange={(e) => setSaveResourceDefaults(e.target.checked)}
                      className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer h-3.5 w-3.5"
                    />
                    <label htmlFor="saveResourceDefaults" className="text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer">
                      Save group booking capability & max capacity to this resource's profile
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 italic pt-1 border-t border-purple-200/40 dark:border-purple-900/30">
                  Individual booking only. Multi-person invitations are turned off.
                </div>
              )}
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
