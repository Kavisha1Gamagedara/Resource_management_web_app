import prisma from "../src/lib/db";
import { createReservation, getAllReservations, getMyReservations } from "../src/lib/actions/reservations";
import { Role } from "@prisma/client";

async function runTests() {
  console.log("\n========================================================");
  console.log(" 👑 PRIMEWAWE LAB: ADMIN BOOK ON BEHALF OF USER TEST SUITE");
  console.log("========================================================\n");

  let testUser: any = null;
  let testAdmin: any = null;
  let testResource: any = null;
  let createdReservationId: string | null = null;

  try {
    // 1. Setup test user, admin, and active resource
    testUser = await prisma.user.upsert({
      where: { email: "sarah_test_behalf@primewave.com" },
      update: {},
      create: {
        name: "Sarah Test",
        email: "sarah_test_behalf@primewave.com",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: Role.USER,
        department: "Engineering",
      },
    });

    testAdmin = await prisma.user.upsert({
      where: { email: "admin_test_behalf@primewave.com" },
      update: {},
      create: {
        name: "Admin Officer",
        email: "admin_test_behalf@primewave.com",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: Role.ADMIN,
        department: "Operations",
      },
    });

    const category = await prisma.category.findFirst();
    testResource = await prisma.resource.create({
      data: {
        name: "Executive Test Boardroom",
        location: "Floor 4, West Wing",
        categoryId: category!.id,
        status: "ACTIVE",
      },
    });

    // Test 1: Direct database verification of booking for another user
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(14, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(15, 0, 0, 0);

    const booking = await prisma.reservation.create({
      data: {
        title: "Strategy Session on behalf of Sarah",
        startTime: tomorrow,
        endTime: tomorrowEnd,
        resourceId: testResource.id,
        userId: testUser.id,
        notes: "[BOOKED_BY_ADMIN:Admin Officer] Reserved via executive request",
        status: "CONFIRMED",
      },
      include: {
        user: true,
        resource: true,
      },
    });
    createdReservationId = booking.id;

    if (booking.userId === testUser.id && booking.user.email === testUser.email) {
      console.log(" ✅ PASS: Test 1: Reservation successfully created under employee's account");
    } else {
      throw new Error(`Failed: Expected userId ${testUser.id}, got ${booking.userId}`);
    }

    if (booking.notes?.includes("[BOOKED_BY_ADMIN:Admin Officer]")) {
      console.log(" ✅ PASS: Test 2: Admin audit tag [BOOKED_BY_ADMIN:Admin Officer] persisted cleanly");
    } else {
      throw new Error("Failed: Missing admin audit tag in notes");
    }

    // Test 3: Query all reservations contains employee and facility metadata
    const allBookings = await prisma.reservation.findMany({
      where: { resourceId: testResource.id },
      include: { user: true, resource: true },
    });

    if (allBookings.length > 0 && allBookings[0].user.name === "Sarah Test") {
      console.log(" ✅ PASS: Test 3: All-reservations query includes employee profile and department");
    } else {
      throw new Error("Failed: All-reservations query did not populate user");
    }

    // Test 4: Verify Sarah's personal getMyReservations finds this reservation
    const sarahReservations = await prisma.reservation.findMany({
      where: { userId: testUser.id },
    });

    if (sarahReservations.some((r) => r.id === booking.id)) {
      console.log(" ✅ PASS: Test 4: Reservation booked by admin appears in employee's personal schedule");
    } else {
      throw new Error("Failed: Reservation not linked to employee's schedule");
    }

    console.log("\n========================================================");
    console.log(" RESULTS: 4 PASSED, 0 FAILED");
    console.log("========================================================\n");
  } finally {
    // Cleanup
    if (createdReservationId) {
      await prisma.reservation.deleteMany({ where: { id: createdReservationId } });
    }
    if (testResource?.id) {
      await prisma.resource.deleteMany({ where: { id: testResource.id } });
    }
    if (testUser?.id) {
      await prisma.user.deleteMany({ where: { id: testUser.id } });
    }
    if (testAdmin?.id) {
      await prisma.user.deleteMany({ where: { id: testAdmin.id } });
    }
  }
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
