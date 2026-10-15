"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, formatTimeRange, formatDate, formatTime } from "@/lib/utils";
import { EditReservationModal } from "./EditReservationModal";
import { cancelReservation } from "@/lib/actions/reservations";
import { AddToCalendarButton } from "./AddToCalendarButton";

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
}

export function MyReservationsClient({
  initialReservations,
  userName,
}: MyReservationsClientProps) {
  const router = useRouter();
  const [reservations, setReservations] = useState<ReservationItem[]>(initialReservations);
  const [activeTab, setActiveTab] = useState<"UPCOMING" | "PAST" | "CANCELLED">("UPCOMING");
  const [search, setSearch] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit Modal State
  const [reservationToEdit, setReservationToEdit] = useState<ReservationItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const now = new Date();

  // Filter reservations based on active tab and search query
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

    if (!search.trim()) return true;

    const q = search.toLowerCase();
    const titleMatch = item.title.toLowerCase().includes(q);
    const resourceMatch = item.resource.name.toLowerCase().includes(q);
    const locationMatch = item.resource.location.toLowerCase().includes(q);
    const notesMatch = item.notes?.toLowerCase().includes(q) || false;

    return titleMatch || resourceMatch || locationMatch || notesMatch;
  });

  // Handle Cancel Booking
  const handleCancel = async (item: ReservationItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel your reservation for "${item.title}"?\nThis slot will immediately become available for others to book.`
    );
    if (!confirmed) return;

    setCancellingId(item.id);
    setStatusMessage(null);

    try {
      const res = await cancelReservation(item.id);
      if (res.success) {
        setStatusMessage({
          type: "success",
          text: `Reservation for "${item.title}" successfully cancelled. Time slot freed.`,
        });
        // Optimistically update list
        setReservations((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, status: "CANCELLED" } : r))
        );
        router.refresh();
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to cancel reservation.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "An unexpected error occurred.",
      });
    } finally {
      setCancellingId(null);
    }
  };

  // Handle successful edit
  const handleEditSuccess = (updatedItem: any) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === updatedItem.id ? { ...r, ...updatedItem } : r))
    );
    setStatusMessage({
      type: "success",
      text: "Reservation successfully rescheduled and updated.",
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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            My Reservations
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            Manage your personal facility bookings, reschedule timeslots, or export directly to your calendar.
          </p>
        </div>

        <Link
          href="/resources"
          className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition-all self-start sm:self-auto"
        >
          <Building2 className="h-4 w-4" />
          <span>New Reservation</span>
        </Link>
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

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="inline-flex rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800/60 self-start">
          <button
            onClick={() => setActiveTab("UPCOMING")}
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
            onClick={() => setActiveTab("PAST")}
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
            onClick={() => setActiveTab("CANCELLED")}
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

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search my bookings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-3.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 shadow-sm"
          />
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
            {activeTab === "UPCOMING"
              ? "You do not have any upcoming reservations scheduled."
              : `No ${activeTab.toLowerCase()} reservations recorded.`}
          </p>
          {activeTab === "UPCOMING" && (
            <Link
              href="/resources"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition-all"
            >
              <span>Explore Facilities & Reserve a Slot</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReservations.map((item) => {
            const isCancelled = item.status === "CANCELLED";
            const isPast = new Date(item.endTime) < now && !isCancelled;

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

                    <div className="flex items-center gap-1.5">
                      {item.isPrivate && (
                        <Badge variant="purple" size="sm">
                          🔒 Private
                        </Badge>
                      )}
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

                  {/* Notes if any */}
                  {item.notes && (
                    <p className="mt-3 text-xs text-zinc-500 italic bg-zinc-50/50 p-2 rounded-lg dark:bg-zinc-800/40">
                      &quot;{item.notes}&quot;
                    </p>
                  )}
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

                    {!isCancelled && (
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
                        onClick={() => handleCancel(item)}
                        disabled={cancellingId === item.id}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 transition-colors cursor-pointer"
                      >
                        {cancellingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        <span>Cancel Booking</span>
                      </button>
                    </div>
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
    </div>
  );
}
