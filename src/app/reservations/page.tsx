import { Metadata } from "next";
import prisma from "@/lib/db";
import { TeamScheduleClient } from "@/components/reservations/TeamScheduleClient";

export const metadata: Metadata = {
  title: "Team Schedule & Cross-Views | PrimeWave Hub",
  description:
    "Cross-organizational reservation schedule. Inspect all bookings for any resource or colleague with real-time availability.",
};

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  // Query all data needed for cross-views
  const [reservations, resources, users, categories] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        status: {
          in: ["CONFIRMED", "CANCELLED"],
        },
      },
      include: {
        resource: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    }),
    prisma.resource.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            reservations: {
              where: {
                status: "CONFIRMED",
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        avatarUrl: true,
        _count: {
          select: {
            reservations: {
              where: {
                status: "CONFIRMED",
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return (
    <div className="py-6 sm:py-8">
      <TeamScheduleClient
        initialReservations={reservations as any}
        resources={resources as any}
        users={users as any}
        categories={categories}
      />
    </div>
  );
}
