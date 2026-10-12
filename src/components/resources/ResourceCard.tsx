import React from "react";
import Link from "next/link";
import {
  MapPin,
  Users,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Ban,
  Tag,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ResourceStatus } from "@/types";

interface ResourceCardProps {
  resource: {
    id: string;
    name: string;
    description?: string | null;
    location: string;
    capacity?: number | null;
    status: ResourceStatus;
    category?: {
      name: string;
      slug: string;
    } | null;
    attributes?: any;
    _count?: {
      reservations: number;
    };
  };
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const statusConfig = {
    ACTIVE: {
      label: "Available",
      variant: "success" as const,
      icon: CheckCircle,
    },
    MAINTENANCE: {
      label: "Maintenance",
      variant: "warning" as const,
      icon: AlertTriangle,
    },
    INACTIVE: {
      label: "Inactive",
      variant: "neutral" as const,
      icon: Ban,
    },
  }[resource.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-teal-500/30 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-teal-500/30">
      <div>
        {/* Header: Category & Status */}
        <div className="flex items-center justify-between gap-2">
          {resource.category && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-900">
              <Tag className="h-3 w-3" />
              {resource.category.name}
            </span>
          )}

          <Badge variant={statusConfig.variant} size="sm">
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Title & Description */}
        <h3 className="mt-3 text-lg font-semibold tracking-tight text-zinc-900 group-hover:text-teal-700 dark:text-zinc-100 dark:group-hover:text-teal-400 transition-colors">
          {resource.name}
        </h3>

        {resource.description && (
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
            {resource.description}
          </p>
        )}

        {/* Location & Capacity Details */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-zinc-400" />
            <span>{resource.location}</span>
          </div>

          {resource.capacity !== null && resource.capacity !== undefined && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-zinc-400" />
              <span>Capacity: {resource.capacity} people</span>
            </div>
          )}

          {resource._count?.reservations !== undefined && (
            <div className="flex items-center gap-1.5 text-zinc-500 ml-auto">
              <Calendar className="h-3.5 w-3.5" />
              <span>{resource._count.reservations} booked</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
        <Link
          href={`/resources/${resource.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-teal-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-teal-300"
        >
          <span>View Availability & Schedule</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
