import Link from "next/link";
import prisma from "@/lib/db";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { Badge } from "@/components/ui/Badge";
import { formatTimeRange } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { getOperationsAnalytics } from "@/lib/analytics";
import { OperationsInsightsWidget } from "@/components/dashboard/OperationsInsightsWidget";
import {
  Building2,
  CalendarCheck2,
  Layers,
  Users2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Search,
} from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  // Query live summary statistics from database
  const [
    totalResources,
    totalCategories,
    totalReservations,
    totalUsers,
    categories,
    recentResources,
    upcomingReservations,
    operationsAnalytics,
  ] = await Promise.all([
    prisma.resource.count(),
    prisma.category.count(),
    prisma.reservation.count({ where: { status: "CONFIRMED" } }),
    prisma.user.count(),
    prisma.category.findMany({
      include: {
        _count: {
          select: { resources: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.resource.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        category: {
          select: { name: true, slug: true },
        },
        _count: {
          select: { reservations: true },
        },
      },
    }),
    // RBAC: Only admin sees all organizational reservations.
    // Regular users only see what is related to them (their personal bookings).
    prisma.reservation.findMany({
      take: 6,
      where: {
        status: "CONFIRMED",
        ...(isAdmin ? {} : { userId: user?.id || "__UNAUTHENTICATED__" }),
      },
      orderBy: { startTime: "asc" },
      include: {
        resource: {
          select: { name: true, location: true },
        },
        user: {
          select: { name: true, department: true },
        },
      },
    }),
    isAdmin ? getOperationsAnalytics() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-teal-950 p-8 sm:p-12 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-300 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>PrimeWave Lab Technical Assessment</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Centralized Resource Reservation Hub
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl">
            Streamline your organization&apos;s shared facilities, A/V gear, engineering labs,
            and company vehicles with guaranteed conflict prevention and clear visibility.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/resources"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-semibold text-zinc-950 shadow-md transition-all hover:bg-teal-400 hover:shadow-teal-500/25 cursor-pointer"
            >
              <span>Explore Resource Catalog</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/reservations"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-5 py-3 text-sm font-semibold text-zinc-200 transition-all hover:bg-zinc-700 hover:text-white cursor-pointer"
            >
              <span>View Team Schedule</span>
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-16 -bottom-16 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
      </section>

      {/* Metrics Summary Cards */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Resources</span>
            <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {totalResources}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Across {totalCategories} categories</p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Resource Categories</span>
            <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {totalCategories}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Rooms, Gear, Labs, Fleet</p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Bookings</span>
            <CalendarCheck2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {totalReservations}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Conflict-free reservations</p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Team Personnel</span>
            <Users2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {totalUsers}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Pre-seeded accounts</p>
        </div>
      </section>

      {/* Feature 3: Facility Utilization & Peak-Hour Analytics Widget (RBAC: Admin Only) */}
      {isAdmin && operationsAnalytics && (
        <OperationsInsightsWidget analytics={operationsAnalytics} />
      )}

      {/* Categories Bar */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Categories
            </h2>
            <p className="text-xs text-zinc-500">Filter shared facilities and equipment by group</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm hover:border-teal-500/40 transition-colors dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                  {category.name}
                </span>
                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                  {category._count.resources} items
                </span>
              </div>
              {category.description && (
                <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                  {category.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Featured Resources Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Available Resources
            </h2>
            <p className="text-xs text-zinc-500">
              Live facility list loaded directly from PostgreSQL
            </p>
          </div>
          <Link
            href="/resources"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 inline-flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      </section>

      {/* Scheduled Reservations Preview (RBAC: Admin sees all, users see what is related to them) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{isAdmin ? "Upcoming Reservations Preview" : "My Upcoming Reservations"}</span>
              {isAdmin ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Admin (All Bookings)
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  Your Bookings
                </span>
              )}
            </h2>
            <p className="text-xs text-zinc-500">
              {isAdmin
                ? "Organization-wide activity schedule across all facilities"
                : "Active bookings and reservations scheduled by you"}
            </p>
          </div>
          <Link
            href={isAdmin ? "/reservations" : "/my-reservations"}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 inline-flex items-center gap-1"
          >
            <span>{isAdmin ? "Full Schedule" : "View All My Bookings"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {upcomingReservations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
            <CalendarCheck2 className="mx-auto h-8 w-8 text-zinc-400" />
            <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No upcoming reservations found
            </h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
              {isAdmin
                ? "There are currently no active confirmed bookings across any organizational facility."
                : "You do not have any active upcoming reservations scheduled at this time."}
            </p>
            <div className="mt-4">
              <Link
                href="/resources"
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition-all"
              >
                <span>Reserve a Facility</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200/80 bg-white overflow-hidden shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {upcomingReservations.map((res) => (
                <div
                  key={res.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                        {res.title}
                      </span>
                      <Badge variant="success" size="sm">
                        Confirmed
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-teal-700 dark:text-teal-400">
                        {res.resource.name}
                      </span>
                      <span>•</span>
                      <span>{res.resource.location}</span>
                      <span>•</span>
                      <span>
                        {formatTimeRange(res.startTime, res.endTime)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500 flex items-center gap-2 self-start sm:self-auto">
                    <span>Reserved by</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {res.user.name}
                    </span>
                    {res.user.department && (
                      <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px]">
                        {res.user.department}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
