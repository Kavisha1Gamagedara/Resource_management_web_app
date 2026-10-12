import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import {
  MapPin,
  Users,
  Tag,
  ArrowLeft,
  AlertTriangle,
  Ban,
  CheckCircle,
  Building2,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { AvailabilityTimeline } from "@/components/reservations/AvailabilityTimeline";

interface ResourceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResourceDetailPage({
  params,
}: ResourceDetailPageProps) {
  const { id } = await params;

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      category: true,
      reservations: {
        where: {
          status: "CONFIRMED",
        },
        include: {
          user: {
            select: {
              name: true,
              department: true,
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
      },
    },
  });

  if (!resource) {
    notFound();
  }

  const isAvailable = resource.status === "ACTIVE";

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link
        href="/resources"
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Resource Catalog</span>
      </Link>

      {/* Facility Header Info */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900">
                <Tag className="h-3 w-3" />
                {resource.category.name}
              </span>

              <Badge
                variant={
                  resource.status === "ACTIVE"
                    ? "success"
                    : resource.status === "MAINTENANCE"
                    ? "warning"
                    : "neutral"
                }
                size="sm"
              >
                {resource.status}
              </Badge>
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {resource.name}
            </h1>

            {resource.description && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
                {resource.description}
              </p>
            )}
          </div>
        </div>

        {/* Location & Capacity Badges */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-zinc-400" />
            <span className="font-medium">Location:</span>
            <span>{resource.location}</span>
          </div>

          {resource.capacity !== null && (
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-zinc-400" />
              <span className="font-medium">Capacity:</span>
              <span>{resource.capacity} people</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 ml-auto text-zinc-500">
            <Calendar className="h-4 w-4" />
            <span>{resource.reservations.length} confirmed bookings</span>
          </div>
        </div>

        {/* Dynamic Attributes / Specs Chips */}
        {resource.attributes && typeof resource.attributes === "object" && (
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Specifications & Amenities
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(resource.attributes as Record<string, any>).map(
                ([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <strong className="capitalize mr-1">{key}:</strong>{" "}
                    {typeof value === "boolean"
                      ? value ? "Yes" : "No"
                      : Array.isArray(value)
                      ? value.join(", ")
                      : String(value)}
                  </span>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Offline Warning if Inactive or Maintenance */}
      {!isAvailable && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <span className="font-bold">Resource Currently Unavailable</span>
            <p className="mt-0.5">
              This facility has status <strong>{resource.status}</strong> and cannot accept new
              reservations at this time.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Visual Timeline & Booking Modal */}
      <AvailabilityTimeline
        resourceId={resource.id}
        resourceName={resource.name}
        isResourceActive={isAvailable}
        reservations={resource.reservations}
      />
    </div>
  );
}
