import { getMyReservations } from "@/lib/actions/reservations";
import { MyReservationsClient } from "@/components/reservations/MyReservationsClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";


export default async function MyReservationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?callbackUrl=/my-reservations");
  }

  const reservations = await getMyReservations();

  return (
    <MyReservationsClient
      initialReservations={reservations as any}
      userName={session.user.name || "Team Member"}
    />
  );
}
