import { getTeamReservations, getTeamMembers } from "@/lib/actions/reservations";
import { getResources } from "@/lib/actions/resources";
import { TeamScheduleClient } from "@/components/reservations/TeamScheduleClient";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function TeamSchedulePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?callbackUrl=/reservations");
  }

  // RBAC: Only admin should see all reservations across the team.
  // Other users are redirected to their own reservations page.
  if (user.role !== "ADMIN") {
    redirect("/my-reservations");
  }

  const [reservations, resources, teamMembers] = await Promise.all([
    getTeamReservations(),
    getResources(),
    getTeamMembers(),
  ]);

  return (
    <TeamScheduleClient
      initialReservations={reservations}
      resources={resources}
      teamMembers={teamMembers}
    />
  );
}
