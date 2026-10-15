import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateIcsContent } from "@/lib/calendar";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        resource: {
          include: { category: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!reservation) {
      return new NextResponse("Reservation not found", { status: 404 });
    }

    const titleText = `${reservation.title} - ${reservation.resource.name}`;
    const descriptionText = [
      `Resource: ${reservation.resource.name} (${reservation.resource.category.name})`,
      `Reserved by: ${reservation.user.name} (${reservation.user.email})`,
      reservation.notes ? `Notes: ${reservation.notes}` : "",
      "Managed by PrimeWave Lab Resource Hub",
    ]
      .filter(Boolean)
      .join("\n");

    const icsString = generateIcsContent({
      id: reservation.id,
      title: titleText,
      description: descriptionText,
      location: reservation.resource.location,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
    });

    const safeFilename = `${
      reservation.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "reservation"
    }.ics`;

    return new NextResponse(icsString, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Failed to generate .ics file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
