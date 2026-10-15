"use client";

import * as React from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  User,
  Layers,
  MapPin,
  Clock,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { formatTime, formatDate } from "@/lib/utils";
import { AddToCalendarButton } from "./AddToCalendarButton";
import { cleanUserNotes } from "@/lib/ghost-booking";

interface TeamScheduleClientProps {
  initialReservations: any[];
  resources: any[];
  teamMembers: any[];
}

export function TeamScheduleClient({
  initialReservations,
  resources,
  teamMembers,
}: TeamScheduleClientProps) {
  const [selectedResourceId, setSelectedResourceId] = React.useState<string>("ALL");
  const [selectedUserId, setSelectedUserId] = React.useState<string>("ALL");
  const [selectedDate, setSelectedDate] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Filter reservations
  const filtered = React.useMemo(() => {
    return initialReservations.filter((res) => {
      if (selectedResourceId !== "ALL" && res.resourceId !== selectedResourceId) {
        return false;
      }

      if (selectedUserId !== "ALL" && res.userId !== selectedUserId) {
        return false;
      }

      if (statusFilter !== "ALL" && res.status !== statusFilter) {
        return false;
      }

      if (selectedDate) {
        const start = format(new Date(res.startTime), "yyyy-MM-dd");
        if (start !== selectedDate) {
          return false;
        }
      }

      return true;
    });
  }, [initialReservations, selectedResourceId, selectedUserId, statusFilter, selectedDate]);

  const resetFilters = () => {
    setSelectedResourceId("ALL");
    setSelectedUserId("ALL");
    setSelectedDate("");
    setStatusFilter("ALL");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <CalendarDays className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          Team Schedule & Facility Agendas
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Coordinate organizational reservations across departments. Filter bookings by specific facility or team member.
        </p>
      </div>

      {/* Filter Controls Card (Story 5: View by Resource or Person) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Filter Schedule
          </span>
          {(selectedResourceId !== "ALL" ||
            selectedUserId !== "ALL" ||
            selectedDate !== "" ||
            statusFilter !== "ALL") && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <RotateCcw className="w-3 h-3 mr-1" /> Reset All
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Filter by Resource */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> By Resource
            </label>
            <select
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Resources ({resources.length})</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.category.name})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter by Person */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400" /> By Colleague / Person
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Team Members ({teamMembers.length})</option>
              {teamMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.department || u.role}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter by Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> By Date
            </label>
            <Input
              type="date"
              value={selectedDate}
              min={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs h-9 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
            />
          </div>

          {/* 4. Filter by Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Booking Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <span>
          Showing <span className="text-slate-900 dark:text-white font-semibold">{filtered.length}</span> matching reservation(s)
        </span>
      </div>

      {/* Reservation Cards List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 bg-white/50 dark:bg-slate-900/40">
          <CalendarDays className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No reservations found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No scheduled bookings match the active filter criteria.
          </p>
          <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((res) => {
            const isConfirmed = res.status === "CONFIRMED";

            return (
              <Card
                key={res.id}
                className="border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md transition-all p-5 dark:border-slate-800/90 dark:bg-slate-900/80 dark:hover:border-slate-700/80"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Meeting info & Resource */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {res.title}
                      </span>
                      {res.status === "CANCELLED" && (res.notes?.includes("AUTO_RELEASED") || res.adminNotes?.includes("AUTO_RELEASED")) ? (
                        <Badge variant="danger" className="text-[10px]">
                          👻 Auto-Released (No-Show)
                        </Badge>
                      ) : isConfirmed ? (
                        <>
                          <Badge variant="success" className="text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmed
                          </Badge>
                          {(res.notes?.includes("CHECKED_IN") || res.adminNotes?.includes("CHECKED_IN")) && (
                            <Badge variant="teal" className="text-[10px]">
                              ✅ Checked In
                            </Badge>
                          )}
                        </>
                      ) : (
                        <Badge variant="danger" className="text-[10px]">
                          <XCircle className="w-3 h-3 mr-1" /> Cancelled
                        </Badge>
                      )}
                      {isConfirmed && new Date(res.endTime).getTime() > Date.now() && (
                        <AddToCalendarButton
                          event={{
                            id: res.id,
                            title: `${res.title} - ${res.resource.name}`,
                            description: res.notes,
                            location: res.resource.location,
                            startTime: res.startTime,
                            endTime: res.endTime,
                          }}
                          size="sm"
                          variant="subtle"
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                        <Layers className="w-3.5 h-3.5" />
                        {res.resource.name} ({res.resource.category.name})
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {res.resource.location}
                      </span>
                    </div>

                    {cleanUserNotes(res.notes) && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/60 max-w-xl">
                        &quot;{cleanUserNotes(res.notes)}&quot;
                      </p>
                    )}
                  </div>

                  {/* Right: Person and Date/Time */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80">
                    {/* Time Badge */}
                    <div className="text-left md:text-right">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center md:justify-end gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        {formatTime(res.startTime)} – {formatTime(res.endTime)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatDate(res.startTime)}
                      </div>
                    </div>

                    {/* Organizer / Person Chip */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-white overflow-hidden ring-1 ring-slate-300 dark:ring-slate-700">
                        {res.user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={res.user.avatarUrl}
                            alt={res.user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (res.user.name || "U")[0].toUpperCase()
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                          {res.user.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          {res.user.department || res.user.email}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
