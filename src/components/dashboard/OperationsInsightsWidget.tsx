"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight,
  Flame,
  Zap,
  Building2,
  Calendar,
  CheckCircle2,
  Info,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { OperationsAnalytics, HourlyDistributionPoint } from "@/lib/analytics";

interface OperationsInsightsWidgetProps {
  analytics: OperationsAnalytics;
}

export function OperationsInsightsWidget({ analytics }: OperationsInsightsWidgetProps) {
  const [hoveredHour, setHoveredHour] = useState<HourlyDistributionPoint | null>(null);

  const { mostUtilized, peakHours, underutilized, summary } = analytics;

  return (
    <section className="space-y-6 rounded-3xl border border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50/50 p-6 sm:p-8 shadow-sm dark:border-zinc-800 dark:from-zinc-900/90 dark:to-zinc-950/70">
      {/* Widget Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <BarChart3 className="h-4 w-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Operations & Facility Utilization Insights
            </h2>
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              <span>Admin Only (RBAC)</span>
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 max-w-2xl">
            Real-time facility utilization and hourly peak demand distribution to maximize asset ROI and eliminate scheduling bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          <Calendar className="h-3.5 w-3.5 text-zinc-400" />
          <span>Rolling 7-Day Window</span>
        </div>
      </div>

      {/* 3 Core Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Most Utilized Facility */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-white p-5 shadow-xs dark:border-amber-900/40 dark:from-amber-950/20 dark:via-zinc-900 dark:to-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                <span>Most Utilized Facility</span>
              </span>
              <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                High Demand
              </span>
            </div>

            {mostUtilized ? (
              <div className="mt-3">
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                  {mostUtilized.resourceName}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {mostUtilized.categoryName} • {mostUtilized.location}
                </p>

                {/* Big Utilization Rate */}
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                    {mostUtilized.utilizationRate}%
                  </span>
                  <span className="text-xs font-semibold text-zinc-500">
                    weekly utilization
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                    style={{ width: `${Math.min(mostUtilized.utilizationRate, 100)}%` }}
                  />
                </div>

                <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Booked for <strong className="text-zinc-700 dark:text-zinc-200">{mostUtilized.bookedHours} hrs</strong> across {mostUtilized.totalBookings} sessions this week.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-zinc-400">No active bookings recorded</p>
            )}
          </div>

          {mostUtilized && (
            <div className="mt-4 pt-3 border-t border-amber-100 dark:border-amber-950/60">
              <Link
                href={`/resources/${mostUtilized.resourceId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
              >
                <span>View Room Schedule</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        {/* 2. Peak Demand Hours */}
        <div className="relative overflow-hidden rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/40 via-white to-white p-5 shadow-xs dark:border-teal-900/40 dark:from-teal-950/20 dark:via-zinc-900 dark:to-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-teal-500" />
                <span>Peak Demand Window</span>
              </span>
              <span className="rounded-full bg-teal-100 dark:bg-teal-950/80 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:text-teal-300">
                Peak Hours
              </span>
            </div>

            <div className="mt-3">
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                Core Collaboration Block
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Facility contention peaks across company rooms
              </p>

              {/* Big Peak Range */}
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 tracking-tight">
                  {peakHours.peakWindowLabel}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  <span className="text-teal-600 dark:text-teal-400 font-bold">
                    {peakHours.peakPercentage}% of bookings
                  </span>
                  <span>concentrate in these hours</span>
                </div>
              </div>

              {/* Tactical Tip Box */}
              <div className="mt-3 rounded-xl bg-teal-500/10 border border-teal-500/20 p-2.5 text-[11px] text-teal-900 dark:text-teal-200 leading-relaxed">
                💡 <strong>Optimization Tip:</strong> Encourage async updates or schedule 1-on-1s before 10:00 AM or after 3:00 PM to free up peak room slots.
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-teal-100 dark:border-teal-950/60">
            <Link
              href="/reservations"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
            >
              <span>Explore Team Schedule</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* 3. Underutilized Asset Alert */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/40 via-white to-white p-5 shadow-xs dark:border-rose-900/40 dark:from-rose-950/20 dark:via-zinc-900 dark:to-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                <span>Underutilized Asset Alert</span>
              </span>
              <span className="rounded-full bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:text-rose-300">
                Action Required
              </span>
            </div>

            {underutilized ? (
              <div className="mt-3">
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                  {underutilized.resourceName}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {underutilized.categoryName} • {underutilized.location}
                </p>

                {/* Big Metric Alert */}
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                    {underutilized.totalBookings}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500">
                    bookings this week
                  </span>
                </div>

                <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 p-2.5 text-[11px] text-rose-800 dark:text-rose-300">
                  <p className="leading-relaxed">
                    {underutilized.alertMessage}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-zinc-400">All facilities are actively utilized</p>
            )}
          </div>

          {underutilized && (
            <div className="mt-4 pt-3 border-t border-rose-100 dark:border-rose-950/60">
              <Link
                href={`/resources/${underutilized.resourceId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300"
              >
                <span>Inspect Resource Details</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Visual Peak-Demand Mini-Bar Chart */}
      <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Hourly Facility Demand Distribution (8:00 AM – 6:00 PM)</span>
              {hoveredHour && (
                <span className="text-xs font-medium text-teal-600 dark:text-teal-400 animate-in fade-in">
                  • {hoveredHour.label}: {hoveredHour.count} booking(s) {hoveredHour.isPeak ? "(Peak)" : ""}
                </span>
              )}
            </h4>
            <p className="text-xs text-zinc-500">
              Shows simultaneous bookings across meeting rooms, media kits, and lab stations throughout the day.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
              <span>Peak Hours (10 AM - 3 PM)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span>Standard</span>
            </span>
          </div>
        </div>

        {/* The Bar Chart Visualization */}
        <div className="pt-6 pb-2">
          <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-32 px-1">
            {peakHours.hourlyDistribution.map((point) => {
              const heightPct = Math.max(point.percentage, 10);

              return (
                <div
                  key={point.hour}
                  className="group relative flex-1 flex flex-col items-center h-full justify-end cursor-pointer"
                  onMouseEnter={() => setHoveredHour(point)}
                  onMouseLeave={() => setHoveredHour(null)}
                >
                  {/* Floating tooltip above bar */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900">
                    {point.count} {point.count === 1 ? "booking" : "bookings"}
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full max-w-[42px] flex items-end h-full">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        point.isPeak
                          ? "bg-gradient-to-t from-teal-600 to-teal-400 group-hover:from-teal-500 group-hover:to-teal-300 shadow-sm shadow-teal-500/20"
                          : "bg-zinc-200 dark:bg-zinc-800 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-700"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* Hour Label */}
                  <span className="mt-2 text-[10px] sm:text-xs font-semibold text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Footer Pill */}
        <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span>
              Org Average Utilization: <strong className="text-zinc-800 dark:text-zinc-200 font-bold">{summary.averageWeeklyUtilization}%</strong>
            </span>
            <span>•</span>
            <span>
              Weekly Booked Time: <strong className="text-zinc-800 dark:text-zinc-200 font-bold">{summary.totalWeeklyBookedHours} hrs</strong>
            </span>
            <span>•</span>
            <span>
              Active Monitored Facilities: <strong className="text-zinc-800 dark:text-zinc-200 font-bold">{summary.totalActiveResources}</strong>
            </span>
          </div>

          <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">
            ✓ Based on 45-hr benchmark business week
          </span>
        </div>
      </div>
    </section>
  );
}
