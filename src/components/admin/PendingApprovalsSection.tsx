"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  User,
  Lock,
  Calendar,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatTime, formatDate } from "@/lib/utils";
import {
  approveReservation,
  declineReservation,
} from "@/lib/actions/reservations";

export interface PendingReservationItem {
  id: string;
  title: string;
  notes?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  isPrivate: boolean;
  createdAt: Date | string;
  resource: {
    id: string;
    name: string;
    location: string;
    category?: {
      name: string;
      slug: string;
    } | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    department?: string | null;
    avatarUrl?: string | null;
  };
}

interface PendingApprovalsSectionProps {
  initialPending: PendingReservationItem[];
}

export function PendingApprovalsSection({
  initialPending,
}: PendingApprovalsSectionProps) {
  const router = useRouter();
  const [items, setItems] = useState<PendingReservationItem[]>(initialPending);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleApprove = async (id: string, title: string) => {
    setProcessingId(id);
    const result = await approveReservation(id);
    setProcessingId(null);

    if (result.success) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      showToast(
        "success",
        `Reservation "${title}" has been approved and confirmed!`
      );
      router.refresh();
    } else {
      showToast("error", result.error || "Failed to approve reservation.");
    }
  };

  const handleDecline = async (id: string, title: string) => {
    if (
      !confirm(
        `Are you sure you want to decline the private reservation "${title}"? The slot will immediately be released for other team members.`
      )
    ) {
      return;
    }

    setProcessingId(id);
    const result = await declineReservation(id);
    setProcessingId(null);

    if (result.success) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      showToast(
        "success",
        `Reservation "${title}" declined. Time slot has been freed.`
      );
      router.refresh();
    } else {
      showToast("error", result.error || "Failed to decline reservation.");
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-amber-200/80 bg-amber-50/30 p-5 sm:p-6 dark:border-amber-900/60 dark:bg-amber-950/15">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`flex items-center justify-between rounded-2xl p-3.5 text-xs font-semibold ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-4 dark:border-amber-900/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Pending Private Reservations
              </h2>
              <Badge variant="warning" size="sm">
                {items.length} {items.length === 1 ? "Awaiting Review" : "Awaiting Review"}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Review and approve or decline confidential employee requests. The time slots are currently held.
            </p>
          </div>
        </div>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-200/80 p-6 text-center dark:border-amber-900/40">
          <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" />
          <p className="mt-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            No pending private reservations awaiting approval
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            All private booking requests are reviewed and up to date.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const rStart = new Date(item.startTime);
            const rEnd = new Date(item.endTime);
            const isBusy = processingId === item.id;

            return (
              <div
                key={item.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-amber-200/90 bg-white p-4 shadow-2xs dark:border-amber-900/60 dark:bg-zinc-900/90"
              >
                {/* Left: Meeting & Requester */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </span>

                    <Badge variant="warning" size="sm">
                      Pending Approval
                    </Badge>

                    <Badge variant="purple" size="sm">
                      🔒 Private Meeting
                    </Badge>

                    {item.resource.category && (
                      <Badge variant="teal" size="sm">
                        {item.resource.category.name}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                    <Link
                      href={`/resources/${item.resource.id}`}
                      className="font-semibold text-teal-700 hover:underline dark:text-teal-400 flex items-center gap-1"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{item.resource.name}</span>
                    </Link>

                    <span>•</span>
                    <span>{item.resource.location}</span>

                    {item.notes && (
                      <>
                        <span>•</span>
                        <span className="italic text-zinc-500">
                          "{item.notes}"
                        </span>
                      </>
                    )}
                  </div>

                  {/* Requester Info */}
                  <div className="flex items-center gap-2 text-xs text-zinc-500 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      {item.user.avatarUrl ? (
                        <img
                          src={item.user.avatarUrl}
                          alt={item.user.name}
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold">
                          {item.user.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {item.user.name}
                      </span>
                    </div>
                    {item.user.department && (
                      <span>({item.user.department})</span>
                    )}
                    <span>•</span>
                    <span className="text-zinc-400">{item.user.email}</span>
                  </div>
                </div>

                {/* Right: Time Slot & Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="rounded-xl bg-zinc-100 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{formatDate(rStart)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {formatTime(rStart)} – {formatTime(rEnd)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(item.id, item.title)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() => handleDecline(item.id, item.title)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
