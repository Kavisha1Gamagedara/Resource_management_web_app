import { getMyReservations, getAllReservations } from "@/lib/actions/reservations";
import { MyReservationsClient } from "@/components/reservations/MyReservationsClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";

export default async function MyReservationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?callbackUrl=/my-reservations");
  }

  const isAdmin = session.user.role === "ADMIN";

  const [reservations, companyUsers, resources] = await Promise.all([
    isAdmin ? getAllReservations() : getMyReservations(),
    isAdmin
      ? prisma.user.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
            avatarUrl: true,
          },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.resource.findMany({
          where: { status: "ACTIVE" },
          orderBy: { name: "asc" },
          include: { category: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <MyReservationsClient
      initialReservations={reservations as any}
      userName={session.user.name || "Team Member"}
      isAdmin={isAdmin}
      companyUsers={companyUsers as any}
      resources={resources as any}
    />
  );
}
