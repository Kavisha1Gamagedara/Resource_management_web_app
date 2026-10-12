"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  format,
  isSameDay,
  isAfter,
  isBefore,
  startOfDay,
  addDays,
  subDays,
} from "date-fns";
import {
  CalendarDays,
  Building2,
  User,
  Users2,
  Clock,
  MapPin,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Sparkles,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  Shield,
  Briefcase,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatTime, formatDate, formatTimeRange } from "@/lib/utils";
import { BookingModal } from "./BookingModal";
import { EditReservationModal } from "./EditReservationModal";
import {
  cancelReservation,
  approveReservation,
  declineReservation,
} from "@/lib/actions/reservations";

export interface ReservationData {
  id: string;
  title: string;
  notes?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  isPrivate?: boolean;
  adminNotes?: string | null;
  createdAt?: Date | string;
  resourceId: string;
  userId: string;
  resource: {
    id: string;
    name: string;
    location: string;
    capacity?: number | null;
    status: string;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string | null;
    avatarUrl?: string | null;
  };
}

export interface ResourceData {
  id: string;
  name: string;
  location: string;
  capacity?: number | null;
  status: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  _count?: {
    reservations: number;
  };
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  avatarUrl?: string | null;
  _count?: {
    reservations: number;
  };
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
}

interface TeamScheduleClientProps {
  initialReservations: ReservationData[];
  resources: ResourceData[];
  users: UserData[];
  categories: CategoryData[];
}

type ViewMode = "RESOURCE" | "PERSON" | "MASTER";
type DateFilter = "ALL" | "TODAY" | "UPCOMING" | "PAST";

export function TeamScheduleClient({
  initialReservations,
  resources,
  users,
  categories,
}: TeamScheduleClientProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [reservations, setReservations] = useState<ReservationData[]>(initialReservations);
  const [viewMode, setViewMode] = useState<ViewMode>("RESOURCE");

  // Selection states
  const [selectedResourceId, setSelectedResourceId] = useState<string>(
    resources[0]?.id || ""
  );
  const [selectedUserId, setSelectedUserId] = useState<string>(
    users[0]?.id || ""
  );

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("UPCOMING");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");

  // Modals
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionNotification, setActionNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setActionNotification({ type, message });
    setTimeout(() => setActionNotification(null), 5000);
  };

  // Extract all unique departments from users list
  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  }, [users]);

  // Current active resource and user objects
  const activeResource = useMemo(
    () => resources.find((r) => r.id === selectedResourceId),
    [resources, selectedResourceId]
  );

  const activeUser = useMemo(
    () => users.find((u) => u.id === selectedUserId),
    [users, selectedUserId]
  );

  // Filter reservations based on active view mode and criteria
  const filteredReservations = useMemo(() => {
    const now = new Date();

    return reservations.filter((res) => {
      // 1. Status: Include confirmed and pending approval reservations
      if (res.status !== "CONFIRMED" && res.status !== "PENDING") return false;

      const rStart = new Date(res.startTime);
      const rEnd = new Date(res.endTime);

      // 2. View Mode constraints
      if (viewMode === "RESOURCE") {
        if (selectedResourceId && res.resourceId !== selectedResourceId) return false;
      } else if (viewMode === "PERSON") {
        if (selectedUserId && res.userId !== selectedUserId) return false;
      }

      // 3. Date Filter
      if (dateFilter === "TODAY") {
        if (!isSameDay(rStart, now)) return false;
      } else if (dateFilter === "UPCOMING") {
        if (rEnd < now) return false;
      } else if (dateFilter === "PAST") {
        if (rEnd >= now) return false;
      }

      // 4. Category filter (in master mode or resource mode)
      if (selectedCategory !== "ALL" && res.resource.category.slug !== selectedCategory) {
        return false;
      }

      // 5. Department filter (in master mode or person mode)
      if (
        selectedDepartment !== "ALL" &&
        res.user.department !== selectedDepartment
      ) {
        return false;
      }

      // 6. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          res.title.toLowerCase().includes(q) ||
          res.resource.name.toLowerCase().includes(q) ||
          res.resource.location.toLowerCase().includes(q) ||
          res.user.name.toLowerCase().includes(q) ||
          (res.notes && res.notes.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [
    reservations,
    viewMode,
    selectedResourceId,
    selectedUserId,
    dateFilter,
    selectedCategory,
    selectedDepartment,
    searchQuery,
  ]);

  // Story 4 / Story 5: Cancel action
  const handleCancelReservation = async (res: ReservationData) => {
    if (
      !confirm(
        `Are you sure you want to cancel the reservation "${res.title}" on ${formatDate(
          res.startTime
        )}? The slot will immediately become free for other team members.`
      )
    ) {
      return;
    }

    setCancellingId(res.id);
    const result = await cancelReservation(res.id);
    setCancellingId(null);

    if (result.success) {
      setReservations((prev) => prev.filter((r) => r.id !== res.id));
      showNotification("success", `Reservation "${res.title}" was cancelled.`);
      router.refresh();
    } else {
      showNotification("error", result.error || "Failed to cancel reservation.");
    }
  };

  // Admin action: Approve private pending reservation
  const handleApproveReservation = async (resId: string) => {
    const result = await approveReservation(resId);
    if (result.success) {
      setReservations((prev) =>
        prev.map((r) => (r.id === resId ? { ...r, status: "CONFIRMED" } : r))
      );
      showNotification("success", "Reservation approved and confirmed! ⚡");
      router.refresh();
    } else {
      showNotification("error", result.error || "Failed to approve reservation.");
    }
  };

  // Admin action: Decline private pending reservation
  const handleDeclineReservation = async (resId: string) => {
    if (!confirm("Are you sure you want to decline this reservation? The slot will immediately be released.")) {
      return;
    }
    const result = await declineReservation(resId);
    if (result.success) {
      setReservations((prev) => prev.filter((r) => r.id !== resId));
      showNotification("success", "Reservation declined and slot has been released.");
      router.refresh();
    } else {
      showNotification("error", result.error || "Failed to decline reservation.");
    }
  };

  const handleEditSuccess = (updated: any) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
    );
    showNotification("success", `Reservation "${updated.title}" updated successfully!`);
    router.refresh();
  };

  // Check if current user can edit/cancel a given reservation
  const canManage = (res: ReservationData) => {
    if (!session?.user) return false;
    return session.user.id === res.userId || session.user.role === "ADMIN";
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Notification */}
      {actionNotification && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${
            actionNotification.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300"
              : "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionNotification.message}</span>
          </div>
          <button
            onClick={() => setActionNotification(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-teal-950 p-6 sm:p-10 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-300 backdrop-blur-sm">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Story 5: Cross-Organizational Schedule Visibility</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Team Schedule Cross-Views
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
            Inspect scheduled reservations across your entire organization. Switch seamlessly
            between viewing all bookings for a <strong>specific resource</strong> or tracking
            the agenda of any <strong>colleague</strong>.
          </p>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="relative z-10 mt-8 flex flex-wrap items-center gap-2 border-t border-zinc-800/80 pt-6">
          <button
            onClick={() => setViewMode("RESOURCE")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              viewMode === "RESOURCE"
                ? "bg-teal-500 text-zinc-950 shadow-md shadow-teal-500/20 font-bold"
                : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>View by Resource</span>
            <span className="ml-1 rounded-full bg-zinc-950/20 px-1.5 py-0.2 text-[10px]">
              {resources.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode("PERSON")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              viewMode === "PERSON"
                ? "bg-teal-500 text-zinc-950 shadow-md shadow-teal-500/20 font-bold"
                : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
            }`}
          >
            <Users2 className="h-4 w-4" />
            <span>View by Colleague / Person</span>
            <span className="ml-1 rounded-full bg-zinc-950/20 px-1.5 py-0.2 text-[10px]">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode("MASTER")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              viewMode === "MASTER"
                ? "bg-teal-500 text-zinc-950 shadow-md shadow-teal-500/20 font-bold"
                : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>All Team Master Schedule</span>
            <span className="ml-1 rounded-full bg-zinc-950/20 px-1.5 py-0.2 text-[10px]">
              {reservations.length}
            </span>
          </button>
        </div>
      </div>

      {/* Perspective Control Panel */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 space-y-5">
        {/* Mode 1: By Resource Selector */}
        {viewMode === "RESOURCE" && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Select Facility, Equipment or Vehicle
                </label>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Pick any asset to inspect its reserved schedule and bookings.
                </p>
              </div>

              {/* Category Quick Filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    selectedCategory === "ALL"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.slug)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      selectedCategory === c.slug
                        ? "bg-teal-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Resource Dropdown or Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              {resources
                .filter(
                  (r) =>
                    selectedCategory === "ALL" ||
                    r.category.slug === selectedCategory
                )
                .map((res) => {
                  const isSelected = res.id === selectedResourceId;
                  return (
                    <button
                      key={res.id}
                      onClick={() => setSelectedResourceId(res.id)}
                      className={`flex items-start justify-between rounded-2xl p-3 text-left transition-all border ${
                        isSelected
                          ? "border-teal-500 bg-teal-50/60 shadow-sm dark:border-teal-500/80 dark:bg-teal-950/40"
                          : "border-zinc-200/80 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="space-y-1 pr-2">
                        <span
                          className={`text-xs font-bold leading-tight block ${
                            isSelected
                              ? "text-teal-950 dark:text-teal-200"
                              : "text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          {res.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <MapPin className="h-3 w-3 shrink-0 text-zinc-400" />
                          <span className="truncate">{res.location}</span>
                        </div>
                      </div>

                      <Badge
                        variant={isSelected ? "success" : "default"}
                        size="sm"
                        className="shrink-0 text-[10px]"
                      >
                        {res.category.name}
                      </Badge>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Mode 2: By Person Selector */}
        {viewMode === "PERSON" && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Select Colleague / Team Member
                </label>
                <p className="text-xs text-zinc-500 mt-0.5">
                  View scheduled bookings and upcoming meetings held by any colleague.
                </p>
              </div>

              {/* Department Quick Filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedDepartment("ALL")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    selectedDepartment === "ALL"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  All Depts
                </button>
                {departments.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDepartment(dept)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      selectedDepartment === dept
                        ? "bg-teal-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* People Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2">
              {users
                .filter(
                  (u) =>
                    selectedDepartment === "ALL" ||
                    u.department === selectedDepartment
                )
                .map((u) => {
                  const isSelected = u.id === selectedUserId;
                  const confirmedCount =
                    u._count?.reservations !== undefined
                      ? u._count.reservations
                      : reservations.filter(
                          (r) => r.userId === u.id && r.status === "CONFIRMED"
                        ).length;

                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`flex flex-col items-center p-3.5 rounded-2xl text-center transition-all border ${
                        isSelected
                          ? "border-teal-500 bg-teal-50/70 shadow-sm dark:border-teal-500 dark:bg-teal-950/40"
                          : "border-zinc-200/80 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="h-11 w-11 rounded-2xl object-cover shadow-xs mb-2"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-sm font-bold mb-2">
                          {u.name.charAt(0)}
                        </div>
                      )}

                      <span
                        className={`text-xs font-bold leading-tight line-clamp-1 ${
                          isSelected
                            ? "text-teal-950 dark:text-teal-200"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {u.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                        {u.department || "PrimeWave Lab"}
                      </span>

                      <div className="mt-2.5 flex items-center gap-1.5">
                        <Badge
                          variant={isSelected ? "success" : "default"}
                          size="sm"
                          className="text-[9px] py-0 px-1.5"
                        >
                          {confirmedCount} {confirmedCount === 1 ? "booking" : "bookings"}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Global Search and Date Filters Bar */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Live Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by meeting title, resource, colleague, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 py-2 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-zinc-400 hover:text-zinc-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Date Filter Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50/80 p-1 dark:border-zinc-800 dark:bg-zinc-950">
            {(["UPCOMING", "TODAY", "ALL", "PAST"] as DateFilter[]).map((df) => (
              <button
                key={df}
                onClick={() => setDateFilter(df)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  dateFilter === df
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {df === "UPCOMING"
                  ? "Upcoming"
                  : df === "TODAY"
                  ? "Today"
                  : df === "ALL"
                  ? "All Dates"
                  : "Past"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Entity Context Banner */}
      {viewMode === "RESOURCE" && activeResource && (
        <div className="rounded-3xl border border-teal-200/80 bg-teal-50/40 p-5 dark:border-teal-900/60 dark:bg-teal-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {activeResource.name}
              </span>
              <Badge variant="teal" size="sm">
                {activeResource.category.name}
              </Badge>
              {activeResource.status === "ACTIVE" ? (
                <Badge variant="success" size="sm">
                  Active
                </Badge>
              ) : (
                <Badge variant="danger" size="sm">
                  {activeResource.status}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                {activeResource.location}
              </span>
              {activeResource.capacity && (
                <span>• Capacity: {activeResource.capacity} people</span>
              )}
              <span>• Total Bookings Found: {filteredReservations.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/resources/${activeResource.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition-colors"
            >
              <span>Inspect Facility Page</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <button
              onClick={() => setBookingModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-500 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Reserve This Resource</span>
            </button>
          </div>
        </div>
      )}

      {viewMode === "PERSON" && activeUser && (
        <div className="rounded-3xl border border-teal-200/80 bg-teal-50/40 p-5 dark:border-teal-900/60 dark:bg-teal-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {activeUser.avatarUrl ? (
              <img
                src={activeUser.avatarUrl}
                alt={activeUser.name}
                className="h-12 w-12 rounded-2xl object-cover shadow-xs"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-200 text-teal-800 dark:bg-teal-900 dark:text-teal-200 font-bold">
                {activeUser.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {activeUser.name}
                </span>
                <Badge
                  variant={activeUser.role === "ADMIN" ? "purple" : "success"}
                  size="sm"
                >
                  {activeUser.role}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {activeUser.department || "PrimeWave Lab"} • {activeUser.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Showing <strong>{filteredReservations.length}</strong> matching reservations
            </span>
          </div>
        </div>
      )}

      {/* Bookings List / Schedule View */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {viewMode === "RESOURCE"
              ? `Scheduled Bookings for ${activeResource?.name || "Resource"}`
              : viewMode === "PERSON"
              ? `Reservations Managed by ${activeUser?.name || "Person"}`
              : "Master Organization Schedule (All Bookings)"}
          </h2>

          <span className="text-xs font-medium text-zinc-500">
            {filteredReservations.length} {filteredReservations.length === 1 ? "Slot" : "Slots"} Found
          </span>
        </div>

        {filteredReservations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <Calendar className="mx-auto h-8 w-8 text-zinc-400" />
            <h3 className="mt-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No matching reservations found
            </h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
              There are currently no confirmed reservations for this selection under the
              active filter ({dateFilter.toLowerCase()}).
            </p>

            {viewMode === "RESOURCE" && activeResource && (
              <button
                onClick={() => setBookingModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-500"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Reserve First Slot for {activeResource.name}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredReservations.map((res) => {
              const rStart = new Date(res.startTime);
              const rEnd = new Date(res.endTime);
              const isPast = rEnd.getTime() < Date.now();
              const userIsOwner = canManage(res);
              const isOwner = session?.user?.id === res.userId;
              const isAdmin = session?.user?.role === "ADMIN";
              const isPending = res.status === "PENDING";

              const displayTitle =
                res.isPrivate && !isOwner && !isAdmin
                  ? "🔒 Private Reservation"
                  : res.title;
              const displayNotes =
                res.isPrivate && !isOwner && !isAdmin
                  ? "Confidential details protected"
                  : res.notes;

              return (
                <div
                  key={res.id}
                  className={`group rounded-3xl border p-5 transition-all ${
                    isPending
                      ? "border-amber-300 bg-amber-50/40 shadow-xs dark:border-amber-800/80 dark:bg-amber-950/20"
                      : isPast
                      ? "border-zinc-200/60 bg-zinc-50/60 opacity-75 dark:border-zinc-800/60 dark:bg-zinc-950/40"
                      : "border-zinc-200/90 bg-white shadow-xs hover:border-teal-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/90 dark:hover:border-teal-800/80"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Meeting & Resource Context */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {displayTitle}
                        </span>

                        {isPending ? (
                          <Badge variant="warning" size="sm">
                            Pending Admin Approval
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            Confirmed
                          </Badge>
                        )}

                        {res.isPrivate && (
                          <Badge variant="purple" size="sm">
                            🔒 Private
                          </Badge>
                        )}

                        {isPast && (
                          <Badge variant="default" size="sm">
                            Past
                          </Badge>
                        )}

                        <Badge variant="teal" size="sm">
                          {res.resource.category.name}
                        </Badge>
                      </div>

                      {/* Resource and Location info */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                        <Link
                          href={`/resources/${res.resource.id}`}
                          className="font-semibold text-teal-700 hover:underline dark:text-teal-400 flex items-center gap-1"
                        >
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span>{res.resource.name}</span>
                        </Link>

                        <span>•</span>

                        <div className="flex items-center gap-1 text-zinc-500">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{res.resource.location}</span>
                        </div>

                        {displayNotes && (
                          <>
                            <span>•</span>
                            <span className="italic text-zinc-500">"{displayNotes}"</span>
                          </>
                        )}
                      </div>

                      {/* Organizer Details */}
                      <div className="flex items-center gap-2 text-xs text-zinc-500 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          {res.user.avatarUrl ? (
                            <img
                              src={res.user.avatarUrl}
                              alt={res.user.name}
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 text-[10px] font-bold">
                              {res.user.name.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {res.user.name}
                          </span>
                        </div>
                        {res.user.department && (
                          <span className="text-zinc-400">({res.user.department})</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Time Slot & Direct Actions */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2 rounded-2xl bg-zinc-100/80 px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        <div>
                          <div>{format(rStart, "EEE, MMM d, yyyy")}</div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {formatTime(rStart)} – {formatTime(rEnd)}
                          </div>
                        </div>
                      </div>

                      {/* Admin Approve/Decline controls for pending private reservations */}
                      {isAdmin && isPending && (
                        <div className="flex items-center gap-1.5 rounded-2xl bg-amber-50 p-1 border border-amber-200 dark:border-amber-900/60 dark:bg-amber-950/40">
                          <button
                            onClick={() => handleApproveReservation(res.id)}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors"
                          >
                            Approve ⚡
                          </button>
                          <button
                            onClick={() => handleDeclineReservation(res.id)}
                            className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-zinc-800 dark:text-rose-400 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {/* Action buttons if user has permissions */}
                      {userIsOwner && !isPast && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              setEditingReservation({
                                id: res.id,
                                title: res.title,
                                notes: res.notes,
                                startTime: res.startTime,
                                endTime: res.endTime,
                                resourceId: res.resourceId,
                                resourceName: res.resource.name,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-2 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                            title="Edit / Reschedule"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-zinc-500" />
                          </button>

                          <button
                            onClick={() => handleCancelReservation(res)}
                            disabled={cancellingId === res.id}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white p-2 text-xs font-medium text-rose-600 shadow-2xs hover:bg-rose-50 dark:border-rose-900/60 dark:bg-zinc-800 dark:text-rose-400"
                            title="Cancel Reservation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {activeResource && (
        <BookingModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          resourceId={activeResource.id}
          resourceName={activeResource.name}
          onSuccess={() => {
            setBookingModalOpen(false);
            showNotification(
              "success",
              `Reservation created for ${activeResource.name}!`
            );
            router.refresh();
          }}
        />
      )}

      {/* Edit Reservation Modal */}
      {editingReservation && (
        <EditReservationModal
          isOpen={Boolean(editingReservation)}
          onClose={() => setEditingReservation(null)}
          reservation={editingReservation}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
