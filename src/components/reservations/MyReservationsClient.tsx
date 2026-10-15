"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  Edit3,
  XCircle,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  ArrowRight,
  ExternalLink,
  UserPlus,
  Users,
  Filter,
  User,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, formatTimeRange, formatDate, formatTime } from "@/lib/utils";
import { EditReservationModal } from "./EditReservationModal";
import { AdminCreateReservationModal } from "@/components/admin/AdminCreateReservationModal";
import { CancelReservationModal } from "./CancelReservationModal";
import {
  cancelReservation,
  checkInReservation,
  autoReleaseGhostBookings,
  simulateGhostRelease,
} from "@/lib/actions/reservations";
import { parseCheckInStatus, getCheckInEligibility, parseCancellationReason } from "@/lib/ghost-booking";
import { parseGroupBooking } from "@/lib/group-booking";
import { AddToCalendarButton } from "./AddToCalendarButton";
import { toast } from "@/components/ui/toast";

interface ReservationItem {
  id: string;
  title: string;
  notes?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  isPrivate?: boolean;
  adminNotes?: string | null;
  resourceId: string;
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    department?: string | null;
    role?: string;
    avatarUrl?: string | null;
  } | null;
  resource: {
    id: string;
    name: string;
    location: string;
    category?: {
      name: string;
      slug: string;
    } | null;
  };
}

interface MyReservationsClientProps {
  initialReservations: ReservationItem[];
  userName: string;
  isAdmin?: boolean;
  currentUserId?: string;
  companyUsers?: any[];
  resources?: any[];
}

export function MyReservationsClient({
  initialReservations,
  userName,
  isAdmin = false,
  currentUserId,
  companyUsers = [],
  resources = [],
}: MyReservationsClientProps) {
  const router = useRouter();
  const [reservations, setReservations] = useState<ReservationItem[]>(initialReservations);
  const [activeTab, setActiveTab] = useState<"UPCOMING" | "PAST" | "CANCELLED">("UPCOMING");
  const [search, setSearch] = useState("");
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("ALL");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");
  const [isAdminBookModalOpen, setIsAdminBookModalOpen] = useState(false);

  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit Modal State
  const [reservationToEdit, setReservationToEdit] = useState<ReservationItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Cancel Modal State (with mandatory reason for admin actions)
  const [reservationToCancel, setReservationToCancel] = useState<ReservationItem | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  const handleTabChange = (tab: "UPCOMING" | "PAST" | "CANCELLED") => {
    setActiveTab(tab);
    if (selectedDateFilter) {
      if (tab === "UPCOMING" && selectedDateFilter < todayStr) {
        setSelectedDateFilter("");
      } else if (tab === "PAST" && selectedDateFilter > todayStr) {
        setSelectedDateFilter("");
      }
    }
  };

  // Distinct departments across all bookings and company users
  const departments = useMemo(() => {
    const set = new Set<string>();
    reservations.forEach((r: any) => {
      if (r.user?.department) set.add(r.user.department);
    });
    companyUsers.forEach((u: any) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  }, [reservations, companyUsers]);

  // Filter reservations based on active tab, search, user, department, and date
  const filteredReservations = reservations.filter((item) => {
    const isCancelled = item.status === "CANCELLED";
    const itemEnd = new Date(item.endTime);
    const isPast = itemEnd < now && !isCancelled;
    const isUpcoming = itemEnd >= now && !isCancelled;

    let tabMatch = false;
    if (activeTab === "UPCOMING") tabMatch = isUpcoming;
    else if (activeTab === "PAST") tabMatch = isPast;
    else if (activeTab === "CANCELLED") tabMatch = isCancelled;

    if (!tabMatch) return false;

    // Filter by specific date
    if (selectedDateFilter) {
      const startDayStr = format(new Date(item.startTime), "yyyy-MM-dd");
      const endDayStr = format(new Date(item.endTime), "yyyy-MM-dd");
      if (startDayStr !== selectedDateFilter && endDayStr !== selectedDateFilter) {
        const filterStart = new Date(selectedDateFilter + "T00:00:00").getTime();
        const filterEnd = new Date(selectedDateFilter + "T23:59:59.999").getTime();
        const s = new Date(item.startTime).getTime();
        const e = new Date(item.endTime).getTime();
        if (s > filterEnd || e < filterStart) {
          return false;
        }
      }
    }

    // Admin employee filter
    if (
      selectedUserFilter !== "ALL" &&
      item.userId !== selectedUserFilter &&
      item.user?.id !== selectedUserFilter
    ) {
      return false;
    }

    // Admin department filter
    if (
      selectedDeptFilter !== "ALL" &&
      item.user?.department !== selectedDeptFilter
    ) {
      return false;
    }

    if (!search.trim()) return true;

    const q = search.toLowerCase();
    const titleMatch = item.title.toLowerCase().includes(q);
    const resourceMatch = item.resource.name.toLowerCase().includes(q);
    const locationMatch = item.resource.location.toLowerCase().includes(q);
    const notesMatch = item.notes?.toLowerCase().includes(q) || false;
    const userNameMatch = item.user?.name?.toLowerCase().includes(q) || false;
    const userEmailMatch = item.user?.email?.toLowerCase().includes(q) || false;
    const deptMatch = item.user?.department?.toLowerCase().includes(q) || false;

    return (
      titleMatch ||
      resourceMatch ||
      locationMatch ||
      notesMatch ||
      userNameMatch ||
      userEmailMatch ||
      deptMatch
    );
  });



  // Handle Check In (Ghost Booking Prevention Feature)
  const handleCheckIn = async (item: ReservationItem) => {
    setCheckingInId(item.id);
    setStatusMessage(null);

    try {
      const res = await checkInReservation(item.id);
      if (res.success) {
        const successMsg = res.message || "Checked in successfully! Room secured.";
        toast.success(successMsg);
        setStatusMessage({
          type: "success",
          text: successMsg,
        });
        setReservations((prev) =>
          prev.map((r) =>
            r.id === item.id
              ? {
                  ...r,
                  notes: `${r.notes ? r.notes + " " : ""}[CHECKED_IN:${res.checkedInAt || new Date().toISOString()}]`,
                }
              : r
          )
        );
        router.refresh();
      } else {
        const errorMsg = res.error || "Failed to check in.";
        toast.error(errorMsg);
        setStatusMessage({
          type: "error",
          text: errorMsg,
        });
      }
    } catch (err: any) {
      const errorMsg = err?.message || "An unexpected error occurred.";
      toast.error(errorMsg);
      setStatusMessage({
        type: "error",
        text: errorMsg,
      });
    } finally {
      setCheckingInId(null);
    }
  };

  // Handle Evaluator Simulation: 15-min unattended no-show auto-release
  const handleSimulateRelease = async (item: ReservationItem) => {
    const confirmed = window.confirm(
      `Simulate 15-Minute No-Show Auto-Release for "${item.title}"?\n\nThis demonstrates the Ghost Booking engine: releasing this unattended slot immediately and freeing the room for your teammates.`
    );
    if (!confirmed) return;

    setSimulatingId(item.id);
    setStatusMessage(null);

    try {
      const res = await simulateGhostRelease(item.id);
      if (res.success) {
        const successMsg = res.message || "Simulated 15-minute no-show: reservation auto-released and freed!";
        toast.success(successMsg);
        setStatusMessage({
          type: "success",
          text: successMsg,
        });
        setReservations((prev) =>
          prev.map((r) =>
            r.id === item.id
              ? {
                  ...r,
                  status: "CANCELLED",
                  notes: `${r.notes ? r.notes + " " : ""}[AUTO_RELEASED: Simulated 15-minute no-show release by evaluator]`,
                }
              : r
          )
        );
        router.refresh();
      } else {
        const errorMsg = res.error || "Failed to simulate ghost release.";
        toast.error(errorMsg);
        setStatusMessage({
          type: "error",
          text: errorMsg,
        });
      }
    } catch (err: any) {
      const errorMsg = err?.message || "An unexpected error occurred.";
      toast.error(errorMsg);
      setStatusMessage({
        type: "error",
        text: errorMsg,
      });
    } finally {
      setSimulatingId(null);
    }
  };

  // Handle Ghost Booking Sweeper (Auto-release expired unattended rooms across the system)
  const handleRunSweeper = async () => {
    setIsSweeping(true);
    setStatusMessage(null);

    try {
      const res = await autoReleaseGhostBookings();
      if (res.success) {
        const successMsg = res.message || "Sweeper finished successfully.";
        toast.success(successMsg);
        setStatusMessage({
          type: "success",
          text: successMsg,
        });
        router.refresh();
      } else {
        const errorMsg = res.error || "Sweeper encountered an error.";
        toast.error(errorMsg);
        setStatusMessage({
          type: "error",
          text: errorMsg,
        });
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to execute auto-release sweeper.";
      toast.error(errorMsg);
      setStatusMessage({
        type: "error",
        text: errorMsg,
      });
    } finally {
      setIsSweeping(false);
    }
  };

  // Handle successful edit
  const handleEditSuccess = (updatedItem: any) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === updatedItem.id ? { ...r, ...updatedItem } : r))
    );
    const msg = `Reservation "${updatedItem.title || "item"}" successfully rescheduled and updated.`;
    toast.success(msg);
    setStatusMessage({
      type: "success",
      text: msg,
    });
    router.refresh();
  };

  // Handle successful cancellation from modal
  const handleCancelSuccess = (cancelledReservation: any) => {
    setReservations((prev) =>
      prev.map((r) =>
        r.id === cancelledReservation.id
          ? { ...r, ...cancelledReservation, status: "CANCELLED" }
          : r
      )
    );
    const msg = `Reservation for "${cancelledReservation.title}" has been cancelled.`;
    toast.success(msg);
    setStatusMessage({
      type: "success",
      text: msg,
    });
    router.refresh();
  };

  const upcomingCount = reservations.filter(
    (r) => r.status !== "CANCELLED" && new Date(r.endTime) >= now
  ).length;
  const pastCount = reservations.filter(
    (r) => r.status !== "CANCELLED" && new Date(r.endTime) < now
  ).length;
  const cancelledCount = reservations.filter((r) => r.status === "CANCELLED").length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {isAdmin ? "Company Reservations" : "My Reservations"}
            </h1>
            {isAdmin && (
              <Badge variant="purple" size="sm" className="font-bold">
                ADMIN AUDIT & MANAGEMENT
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            {isAdmin
              ? "All employee bookings across PrimeWave facilities. Audit reservations, prevent ghost bookings, or create bookings on behalf of users upon request."
              : "Manage your personal facility bookings, reschedule timeslots, or export directly to your calendar."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsAdminBookModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Book for User</span>
            </button>
          )}

          <Link
            href="/resources"
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition-all self-start sm:self-auto"
          >
            <Building2 className="h-4 w-4" />
            <span>New Reservation</span>
          </Link>
        </div>
      </div>

      {/* Toast / Notification Banner */}
      {statusMessage && (
        <div
          className={`flex items-start justify-between rounded-2xl p-4 text-xs font-medium border animate-in fade-in slide-in-from-top-1 ${
            statusMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-400 hover:text-zinc-700 ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Ghost Booking Guard & Auto-Release Control Panel */}
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 text-lg">
            👻
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
              <span>Ghost Booking Prevention Engine</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Active Guard
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5 max-w-2xl">
              Prevents unused conference rooms. Reservations require a check-in within 15 minutes of start time, or the slot is auto-released back to your team. Click <strong className="font-semibold">[✅ Check In Now]</strong> on your active card below or trigger the background sweeper.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunSweeper}
          disabled={isSweeping}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-all self-start md:self-auto cursor-pointer shrink-0 disabled:opacity-50"
        >
          {isSweeping ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Sweeping Ghost Bookings...</span>
            </>
          ) : (
            <>
              <span>⚡ Run Auto-Release Sweeper</span>
            </>
          )}
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="inline-flex rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800/60 self-start">
          <button
            onClick={() => handleTabChange("UPCOMING")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "UPCOMING"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Upcoming</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "UPCOMING"
                  ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
              }`}
            >
              {upcomingCount}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("PAST")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "PAST"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Past History</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "PAST"
                  ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
              }`}
            >
              {pastCount}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("CANCELLED")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "CANCELLED"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Cancelled</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "CANCELLED"
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
              }`}
            >
              {cancelledCount}
            </span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-purple-500 shrink-0" />
            <input
              type="date"
              value={selectedDateFilter}
              min={activeTab === "UPCOMING" ? todayStr : undefined}
              max={activeTab === "PAST" ? todayStr : undefined}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="bg-transparent text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
              title={
                activeTab === "UPCOMING"
                  ? "Filter upcoming reservations by date (past dates disabled)"
                  : activeTab === "PAST"
                  ? "Filter past history by date"
                  : "Filter reservations by date"
              }
            />
            {selectedDateFilter && (
              <button
                type="button"
                onClick={() => setSelectedDateFilter("")}
                className="text-[11px] font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 ml-1 px-1 py-0.5 rounded transition-colors"
                title="Clear date filter"
              >
                ✕
              </button>
            )}
          </div>

          {isAdmin && (
            <>
              {/* Department Filter */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-purple-500 shadow-sm cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              {/* Employee Filter */}
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-purple-500 shadow-sm max-w-[200px] cursor-pointer"
              >
                <option value="ALL">All Employees ({companyUsers.length || "All"})</option>
                {companyUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.department || "General"})
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder={isAdmin ? "Search employee, facility, title..." : "Search my bookings..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-3.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 dark:focus:border-purple-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {filteredReservations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
          <Calendar className="mx-auto h-8 w-8 text-zinc-400" />
          <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
            No {activeTab.toLowerCase()} bookings found
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {selectedDateFilter
              ? `No ${activeTab.toLowerCase()} reservations found on ${selectedDateFilter}.`
              : isAdmin
              ? `No ${activeTab.toLowerCase()} company reservations match the selected filters.`
              : activeTab === "UPCOMING"
              ? "You do not have any upcoming reservations scheduled."
              : `No ${activeTab.toLowerCase()} reservations recorded.`}
          </p>
          {selectedDateFilter && (
            <button
              type="button"
              onClick={() => setSelectedDateFilter("")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear Date Filter</span>
            </button>
          )}
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setIsAdminBookModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Reservation for User</span>
            </button>
          ) : activeTab === "UPCOMING" ? (
            <Link
              href="/resources"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition-all"
            >
              <span>Explore Facilities & Reserve a Slot</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReservations.map((item) => {
            const isCancelled = item.status === "CANCELLED";
            const isPast = new Date(item.endTime).getTime() <= Date.now();
            const checkInInfo = parseCheckInStatus(item.notes || item.adminNotes);
            const cancellationInfo = parseCancellationReason(item.notes || item.adminNotes);
            const eligibility = getCheckInEligibility(item.startTime, item.endTime);
            const groupInfo = parseGroupBooking(item.notes || item.adminNotes);
            const isOrganizer = item.userId === currentUserId;
            const isInvitedAttendee = !isOrganizer && (
              groupInfo.invitedUserIds.includes(currentUserId || "") ||
              (item.notes || "").includes(`[INVITED_USER:${currentUserId}]`)
            );

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm hover:border-teal-500/30 transition-all dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div>
                  {/* Header: Resource Category & Status */}
                  <div className="flex items-center justify-between gap-2">
                    {item.resource.category && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900">
                        <Tag className="h-2.5 w-2.5" />
                        {item.resource.category.name}
                      </span>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 justify-end">
                      {(item.isPrivate || checkInInfo.isPrivate) && (
                        <Badge variant="purple" size="sm">
                          🔒 Private
                        </Badge>
                      )}

                      {groupInfo.isGroupBooking && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900">
                          👥 Group Booking
                        </span>
                      )}

                      {isInvitedAttendee && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900">
                          📩 Invited Attendee
                        </span>
                      )}

                      {groupInfo.isGroupBooking && isOrganizer && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900">
                          👑 Host
                        </span>
                      )}

                      {/* Ghost Booking Badges & Cancellation Badges */}
                      {isCancelled && checkInInfo.isAutoReleased ? (
                        <Badge variant="danger" size="sm">
                          👻 Auto-Released (No-Show)
                        </Badge>
                      ) : isCancelled && cancellationInfo.isCancelledByAdmin ? (
                        <Badge variant="danger" size="sm">
                          🛡️ Cancelled by Admin
                        </Badge>
                      ) : checkInInfo.isCheckedIn ? (
                        <Badge variant="success" size="sm">
                          ✅ Checked In
                        </Badge>
                      ) : !isCancelled && !isPast && checkInInfo.autoReleaseEnabled ? (
                        <Badge variant="warning" size="sm">
                          ⏱️ Check-In Required
                        </Badge>
                      ) : null}

                      <Badge
                        variant={
                          item.status === "PENDING"
                            ? "warning"
                            : item.status === "DECLINED"
                            ? "danger"
                            : isCancelled
                            ? "neutral"
                            : isPast
                            ? "neutral"
                            : "success"
                        }
                        size="sm"
                      >
                        {item.status === "PENDING"
                          ? "Pending Approval"
                          : item.status === "DECLINED"
                          ? "Declined"
                          : isCancelled && checkInInfo.isAutoReleased
                          ? "Auto-Released"
                          : isCancelled && cancellationInfo.isCancelledByAdmin
                          ? "Admin Cancelled"
                          : isCancelled
                          ? "Cancelled"
                          : isPast
                          ? "Past / Concluded"
                          : item.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Title & Resource */}
                  <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {item.title}
                  </h3>

                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                    <Building2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    <span>{item.resource.name}</span>
                    <span>•</span>
                    <span className="text-zinc-500">{item.resource.location}</span>
                  </div>

                  {/* Employee Information (Admin view / Cross-company bookings) */}
                  {item.user && (
                    <div className="mt-2.5 flex items-center justify-between p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {item.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-purple-900 dark:text-purple-200 block truncate">
                            {item.user.name}
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                            {item.user.email}
                          </span>
                        </div>
                      </div>
                      {item.user.department && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shrink-0 ml-2">
                          {item.user.department}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Time Range Badge */}
                  <div className="mt-4 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950/70 border border-zinc-100 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{formatDate(item.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      <span>
                        {formatTime(item.startTime)} – {formatTime(item.endTime)}
                      </span>
                    </div>
                  </div>

                  {/* Clean Notes without internal metadata tags */}
                  {checkInInfo.cleanNotes && (
                    <p className="mt-3 text-xs text-zinc-500 italic bg-zinc-50/50 p-2 rounded-lg dark:bg-zinc-800/40">
                      &quot;{checkInInfo.cleanNotes}&quot;
                    </p>
                  )}

                  {/* Group Booking & Attendees Showcase */}
                  {groupInfo.isGroupBooking && (
                    <div className="mt-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 p-3.5 text-xs text-indigo-950 dark:bg-indigo-950/30 dark:border-indigo-900/60 dark:text-indigo-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
                          <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>Group Session Details</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                          {groupInfo.attendees.length + 1} Participants
                        </span>
                      </div>

                      {/* Organizer Host Info */}
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-indigo-100 dark:border-indigo-950/50 shadow-2xs">
                        <span className="text-sm">👑</span>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 block">
                            Host / Organizer:
                          </span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.user?.name || (isOrganizer ? userName : "Host")}
                          </span>
                          {item.user?.department && (
                            <span className="text-[11px] text-zinc-500 ml-1.5 font-normal">
                              • {item.user.department}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Invited Attendees List */}
                      {groupInfo.attendees.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                            Invited Teammates:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {groupInfo.attendees.map((attendee) => (
                              <span
                                key={attendee.id}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border shadow-2xs ${
                                  attendee.id === currentUserId
                                    ? "bg-teal-50 border-teal-300 text-teal-900 dark:bg-teal-950/80 dark:border-teal-700 dark:text-teal-200 font-bold"
                                    : "bg-white border-zinc-200 text-zinc-800 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200"
                                }`}
                              >
                                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
                                  {attendee.name.charAt(0).toUpperCase()}
                                </span>
                                <span>{attendee.name}</span>
                                {attendee.id === currentUserId && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-teal-200 text-teal-900 dark:bg-teal-900 dark:text-teal-200">
                                    You
                                  </span>
                                )}
                                {attendee.department && (
                                  <span className="text-[10px] opacity-75">({attendee.department})</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {isInvitedAttendee && (
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 italic pt-1">
                          💡 You were invited to this group session. The booking is synced with your dashboard schedule.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Admin Cancellation Reason Notice Box for Affected Users */}
                  {isCancelled && cancellationInfo.isCancelledByAdmin && cancellationInfo.reason ? (
                    <div className="mt-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-900 dark:bg-rose-950/40 dark:border-rose-800/80 dark:text-rose-200">
                      <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <span>Cancelled by Administrator {cancellationInfo.cancelledBy ? `(${cancellationInfo.cancelledBy})` : ""}</span>
                      </div>
                      <div className="mt-2 pl-6 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                          Reason for Cancellation:
                        </span>
                        <p className="text-xs font-medium text-rose-950 dark:text-rose-100 italic bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/60 shadow-xs">
                          &ldquo;{cancellationInfo.reason}&rdquo;
                        </p>
                      </div>
                    </div>
                  ) : isCancelled && cancellationInfo.reason ? (
                    <div className="mt-3 rounded-2xl bg-zinc-100 border border-zinc-200 p-3 text-xs text-zinc-700 dark:bg-zinc-800/60 dark:border-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold block text-zinc-800 dark:text-zinc-200">Cancellation Reason:</span>
                      <p className="mt-1 italic bg-white/60 dark:bg-zinc-900/50 p-2 rounded-lg">&ldquo;{cancellationInfo.reason}&rdquo;</p>
                    </div>
                  ) : null}

                  {/* Ghost Booking Prevention Interactive Card Panel */}
                  {isCancelled && checkInInfo.isAutoReleased ? (
                    <div className="mt-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                      <span className="text-lg shrink-0">👻</span>
                      <div>
                        <span className="font-bold block">Auto-Released due to No-Show</span>
                        <span className="text-[11px] opacity-90 mt-0.5 block">
                          This reservation was automatically cancelled and the room returned to the team pool because no check-in occurred within the 15-minute grace period.
                        </span>
                      </div>
                    </div>
                  ) : !isCancelled && !isPast ? (
                    checkInInfo.isCheckedIn ? (
                      <div className="mt-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-bold">Room Secured & Checked In</span>
                        </div>
                        {checkInInfo.checkedInAt && (
                          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            at {formatTime(checkInInfo.checkedInAt)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                              <span>👻 Ghost Booking Protection</span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                                {checkInInfo.autoReleaseEnabled ? "Auto-Release On" : "Manual"}
                              </span>
                            </span>
                            <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                              {eligibility.canCheckInNow
                                ? "Check-in window is open! Click below to confirm you are occupying the room."
                                : `Check-in window opens 15 mins before start (${formatTime(eligibility.windowOpensAt)}).`}
                            </p>
                          </div>
                        </div>

                        {/* Check-In Action Button */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleCheckIn(item)}
                            disabled={checkingInId === item.id}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {checkingInId === item.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Securing Room...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                <span>✅ Check In Now</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  ) : null}
                </div>

                {/* Actions (Story 4: Edit & Cancel + Feature 2: 1-Click Add to Calendar) */}
                <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/resources/${item.resource.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                    >
                      <span>View Resource</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>

                    {!isCancelled && !isPast && (
                      <AddToCalendarButton
                        size="sm"
                        event={{
                          id: item.id,
                          title: `${item.title} - ${item.resource.name}`,
                          description: item.notes,
                          location: item.resource.location,
                          startTime: item.startTime,
                          endTime: item.endTime,
                        }}
                      />
                    )}
                  </div>

                  {/* Only active upcoming reservations can be edited or cancelled */}
                  {!isCancelled && !isPast && (
                    <div className="flex items-center gap-2">
                      {isOrganizer || isAdmin ? (
                        <>
                          <button
                            onClick={() => {
                              setReservationToEdit(item);
                              setModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-zinc-500" />
                            <span>Edit Slot</span>
                          </button>

                          <button
                            onClick={() => {
                              setReservationToCancel(item);
                              setCancelModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 transition-colors cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Cancel Booking</span>
                          </button>
                        </>
                      ) : isInvitedAttendee ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800">
                          <Users className="h-3 w-3" />
                          <span>Attending Group Session</span>
                        </span>
                      ) : null}
                    </div>
                  )}

                  {isPast && !isCancelled && (
                    <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Past Reservation (Read-Only)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <EditReservationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        reservation={reservationToEdit}
        onSuccess={handleEditSuccess}
      />

      {/* Cancel Reservation Modal */}
      <CancelReservationModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setReservationToCancel(null);
        }}
        reservation={reservationToCancel}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onSuccess={handleCancelSuccess}
      />

      {/* Admin Create Reservation Modal */}
      {isAdmin && (
        <AdminCreateReservationModal
          isOpen={isAdminBookModalOpen}
          onClose={() => setIsAdminBookModalOpen(false)}
          onSuccess={() => {
            setIsAdminBookModalOpen(false);
            setStatusMessage({
              type: "success",
              text: "Reservation booked successfully for employee.",
            });
            router.refresh();
          }}
          users={companyUsers}
          resources={resources}
        />
      )}
    </div>
  );
}
