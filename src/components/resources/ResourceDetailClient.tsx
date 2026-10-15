"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AvailabilityTimeline } from "@/components/reservations/AvailabilityTimeline";
import { BookingModal } from "@/components/reservations/BookingModal";
import {
  ChevronLeft,
  MapPin,
  Users,
  Calendar,
  CheckCircle,
  Wrench,
  Ban,
  Tag,
  Shield,
} from "lucide-react";
import { ResourceStatus } from "@prisma/client";

interface ResourceDetailClientProps {
  resource: {
    id: string;
    name: string;
    description: string | null;
    location: string;
    capacity: number | null;
    status: ResourceStatus;
    attributes: any;
    category: {
      name: string;
      description: string | null;
    };
    reservations: any[];
  };
}

export function ResourceDetailClient({ resource }: ResourceDetailClientProps) {
  const router = useRouter();
  const [isBookingOpen, setIsBookingOpen] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const getStatusBadge = (status: ResourceStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="success" className="gap-1.5 px-3 py-1 text-xs">
            <CheckCircle className="w-3.5 h-3.5" /> Ready for Reservation
          </Badge>
        );
      case "MAINTENANCE":
        return (
          <Badge variant="warning" className="gap-1.5 px-3 py-1 text-xs">
            <Wrench className="w-3.5 h-3.5" /> Under Scheduled Maintenance
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge variant="danger" className="gap-1.5 px-3 py-1 text-xs">
            <Ban className="w-3.5 h-3.5" /> Decommissioned / Inactive
          </Badge>
        );
    }
  };

  const handleSelectSlot = (start: Date, end: Date) => {
    if (resource.status !== "ACTIVE") return;
    setSelectedSlot({ start, end });
    setIsBookingOpen(true);
  };

  const bufferMinutes = Number(resource.attributes?.bufferMinutes) || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link
          href="/resources"
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Catalog
        </Link>
        <span>/</span>
        <span className="text-slate-300">{resource.category.name}</span>
        <span>/</span>
        <span className="text-white font-medium">{resource.name}</span>
      </div>

      {/* Hero Resource Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                {resource.category.name}
              </span>
              {getStatusBadge(resource.status)}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {resource.name}
            </h1>

            {resource.description && (
              <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
                {resource.description}
              </p>
            )}
          </div>

          <Button
            size="lg"
            disabled={resource.status !== "ACTIVE"}
            onClick={() => {
              setSelectedSlot(null);
              setIsBookingOpen(true);
            }}
            className="shrink-0 shadow-lg shadow-emerald-950/60"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {resource.status === "ACTIVE" ? "Reserve This Resource" : "Currently Unavailable"}
          </Button>
        </div>

        {/* Resource Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                Facility Location
              </span>
              <span className="text-sm font-semibold text-white">
                {resource.location}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <Users className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                Capacity / Sizing
              </span>
              <span className="text-sm font-semibold text-white">
                {resource.capacity ? `${resource.capacity} people` : "Flexible / Equipment Unit"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <Shield className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                Booking Policy
              </span>
              <span className="text-sm font-semibold text-white">
                Instant Real-time Confirmation
              </span>
            </div>
          </div>

          {bufferMinutes > 0 ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60">
              <span className="text-xl">🧹</span>
              <div>
                <span className="text-[11px] text-amber-300 uppercase font-semibold block">
                  Turnaround Buffer
                </span>
                <span className="text-sm font-semibold text-white">
                  {bufferMinutes}m Reset & Cleaning
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-lg">⚡</span>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                  Turnaround Policy
                </span>
                <span className="text-sm font-semibold text-white">
                  Direct Back-to-Back Access
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Specifications / Amenities Tags */}
        {resource.attributes && typeof resource.attributes === "object" && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" /> Equipment & Included Amenities
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(resource.attributes)
                .filter(([k]) => k !== "bufferMinutes")
                .map(([key, val]) => (
                  <div
                    key={key}
                    className="px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/60 text-xs text-slate-200 font-medium"
                  >
                    <span className="text-emerald-400 capitalize">{key}: </span>
                    <span>{typeof val === "boolean" ? (val ? "Included" : "None") : String(val)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Visual Availability Timeline & Schedule */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Live Availability & Schedule
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View booked vs. free slots. Click on any free slot to immediately begin a reservation.
          </p>
        </div>

        <AvailabilityTimeline
          reservations={resource.reservations}
          onSelectSlot={handleSelectSlot}
          resourceName={resource.name}
          isResourceActive={resource.status === "ACTIVE"}
          bufferMinutes={bufferMinutes}
        />
      </div>

      {/* Booking Modal */}
      {isBookingOpen && (
        <BookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          resourceId={resource.id}
          resourceName={resource.name}
          initialStartTime={selectedSlot?.start}
          initialEndTime={selectedSlot?.end}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
