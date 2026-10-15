"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  MapPin,
  Users,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";

interface ResourceCardProps {
  resource: {
    id: string;
    name: string;
    description?: string | null;
    location?: string;
    capacity?: number | null;
    status?: string;
    category?: {
      name: string;
      slug?: string;
    } | null;
  };
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const isAvailable = resource.status === "ACTIVE";

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm hover:border-teal-500/40 hover:shadow-md transition-all dark:border-zinc-800 dark:bg-zinc-900/60">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          {resource.category && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900">
              <Layers className="h-2.5 w-2.5" />
              {resource.category.name}
            </span>
          )}

          <Badge
            variant={isAvailable ? "success" : "neutral"}
            className="text-[10px]"
          >
            {isAvailable ? "Available" : resource.status}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
          {resource.name}
        </h3>

        {/* Description */}
        <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2 min-h-[2rem]">
          {resource.description || "Fully equipped enterprise organizational resource."}
        </p>

        {/* Location & Capacity */}
        <div className="mt-4 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">{resource.location}</span>
          </div>

          {resource.capacity && (
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span>Up to {resource.capacity} people</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <Link
          href={`/resources/${resource.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 transition-colors"
        >
          <span>View Schedule & Reserve</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
