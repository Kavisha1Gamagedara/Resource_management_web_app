"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BookingModal } from "@/components/reservations/BookingModal";
import {
  Search,
  MapPin,
  Users,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle,
  Wrench,
  Ban,
  ArrowRight,
  Filter,
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import { ResourceStatus } from "@prisma/client";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ResourceItem {
  id: string;
  name: string;
  description: string | null;
  location: string;
  capacity: number | null;
  status: ResourceStatus;
  attributes: any;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  reservations: {
    id: string;
    title: string;
    startTime: string | Date;
    endTime: string | Date;
  }[];
}

interface ResourceCatalogClientProps {
  initialResources: ResourceItem[];
  categories: Category[];
}

export function ResourceCatalogClient({
  initialResources,
  categories,
}: ResourceCatalogClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedCategory = searchParams.get("category") || "ALL";
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Booking Modal State
  const [bookingTarget, setBookingTarget] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  // Filtered resources
  const filteredResources = React.useMemo(() => {
    return initialResources.filter((res) => {
      // Category filter
      if (selectedCategory !== "ALL" && res.categoryId !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && res.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = res.name.toLowerCase().includes(q);
        const matchesLocation = res.location.toLowerCase().includes(q);
        const matchesDesc = res.description?.toLowerCase().includes(q) || false;
        const matchesAttrs = res.attributes
          ? JSON.stringify(res.attributes).toLowerCase().includes(q)
          : false;

        if (!matchesName && !matchesLocation && !matchesDesc && !matchesAttrs) {
          return false;
        }
      }

      return true;
    });
  }, [initialResources, selectedCategory, statusFilter, searchQuery]);

  const handleCategoryChange = (catId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (catId === "ALL") {
      params.delete("category");
    } else {
      params.set("category", catId);
    }
    router.push(`/resources?${params.toString()}`);
  };

  const getStatusBadge = (status: ResourceStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="w-3 h-3" /> Active
          </Badge>
        );
      case "MAINTENANCE":
        return (
          <Badge variant="warning" className="gap-1">
            <Wrench className="w-3 h-3" /> Maintenance
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge variant="danger" className="gap-1">
            <Ban className="w-3 h-3" /> Inactive
          </Badge>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Resource Catalog
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse and reserve meeting rooms, A/V gear, hardware labs, and vehicles
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by name, location, specs..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs: Categories and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => handleCategoryChange("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === "ALL"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            All Resources ({initialResources.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Status Dropdown Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Resource Grid */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl space-y-3">
          <Search className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No resources matched your filters</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try resetting your search query or switching to another category.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
              handleCategoryChange("ALL");
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const isAvailable = res.status === "ACTIVE";
            const nextBooking = res.reservations[0];

            return (
              <Card
                key={res.id}
                className="group border-slate-800/90 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900 flex flex-col justify-between transition-all duration-200"
              >
                <div className="p-5 space-y-3">
                  {/* Category and Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                      {res.category.name}
                    </span>
                    {getStatusBadge(res.status)}
                  </div>

                  {/* Resource Name and Description */}
                  <div>
                    <Link href={`/resources/${res.id}`} className="group-hover:text-emerald-400 transition-colors">
                      <h3 className="text-lg font-bold text-white leading-snug">
                        {res.name}
                      </h3>
                    </Link>
                    {res.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {res.description}
                      </p>
                    )}
                  </div>

                  {/* Meta: Location & Capacity */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {res.location}
                    </span>
                    {res.capacity && (
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Up to {res.capacity} people
                      </span>
                    )}
                  </div>

                  {/* Dynamic Attributes / Specs Tags */}
                  {res.attributes && typeof res.attributes === "object" && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Number((res.attributes as any)?.bufferMinutes) > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/60 text-[11px] text-amber-300 border border-amber-800/60 font-medium">
                          <span>🧹</span> {(res.attributes as any).bufferMinutes}m buffer
                        </span>
                      )}
                      {Object.entries(res.attributes)
                        .filter(([k]) => k !== "bufferMinutes")
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 rounded bg-slate-800/80 text-[11px] text-slate-300 border border-slate-700/50"
                          >
                            {typeof v === "boolean" ? k : `${k}: ${String(v)}`}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Next Booking Slot Preview */}
                  <div className="pt-2 border-t border-slate-800/60">
                    {nextBooking ? (
                      <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-950/30 p-2 rounded-lg border border-amber-900/40">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">
                          Next: {nextBooking.title} ({formatTime(nextBooking.startTime)} – {formatTime(nextBooking.endTime)})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>No upcoming bookings · Available now</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-5 pt-0 border-t border-slate-800/60 mt-2 flex items-center justify-between gap-2">
                  <Link href={`/resources/${res.id}`} className="w-1/2">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <Calendar className="w-3.5 h-3.5 mr-1" /> Schedule
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    className="w-1/2 text-xs"
                    disabled={!isAvailable}
                    onClick={() => setBookingTarget({ id: res.id, name: res.name })}
                  >
                    {isAvailable ? "Reserve" : "Unavailable"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      {bookingTarget && (
        <BookingModal
          isOpen={true}
          onClose={() => setBookingTarget(null)}
          resourceId={bookingTarget.id}
          resourceName={bookingTarget.name}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
