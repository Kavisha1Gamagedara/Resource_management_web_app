import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { MyReservationsClient } from "@/components/reservations/MyReservationsClient";
import { BookmarkCheck, Lock, ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const metadata = {
  title: "My Reservations | PrimeWave Hub",
  description: "View, modify, and manage your active and past resource reservations.",
};

export default async function MyReservationsPage() {
  const user = await getCurrentUser();

  // If not authenticated, render prompt with 1-click demo persona access
  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
          <BookmarkCheck className="h-8 w-8" />
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Sign In to Manage Your Bookings
        </h1>

        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Fulfills Story 4: "As a user, I can cancel or edit my reservation."
          Sign in to view your scheduled meetings, adjust time slots, or free up resources.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/login?callbackUrl=/my-reservations"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition-all"
          >
            <span>Sign In with 1-Click Demo Persona</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Fetch reservations belonging to this user
  const reservations = await prisma.reservation.findMany({
    where: {
      userId: user.id,
    },
    include: {
      resource: {
        select: {
          id: true,
          name: true,
          location: true,
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
    },
    orderBy: {
      startTime: "desc",
    },
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-zinc-200/80 pb-6 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                <BookmarkCheck className="h-5 w-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                My Bookings & Reservations
              </h1>
              <Badge variant="success" size="sm">
                STORY 4
              </Badge>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-zinc-500">
              Manage your personal facility and equipment reservations. Edit meeting slots or cancel to free them up.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/resources"
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-teal-300 transition-colors"
            >
              <span>+ Book Another Resource</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Client Management Interface */}
      <MyReservationsClient
        initialReservations={reservations as any}
        userName={user.name || "User"}
      />
    </div>
  );
}
