import { PrismaClient, ResourceStatus, ReservationStatus, Role } from "@prisma/client";
import {
  parseCheckInStatus,
  getCheckInEligibility,
} from "../src/lib/ghost-booking";
import { autoReleaseGhostBookings } from "../src/lib/actions/reservations";
import { findConflict } from "../src/lib/booking-engine";

const prisma = new PrismaClient();

async function runGhostBookingTestSuite() {
  console.log("\n========================================================");
  console.log(" 👻 PRIMEWAWE LAB: GHOST BOOKING PREVENTION TEST SUITE");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string = "") {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${testName} - ${detail}`);
      failed++;
    }
  }

  let user = await prisma.user.findFirst();
  let category = await prisma.category.findFirst();

  if (!user || !category) {
    console.error("❌ Required seed data missing (user or category).");
    process.exit(1);
  }

  const testResource = await prisma.resource.create({
    data: {
      name: `Ghost Guard Room ${Date.now()}`,
      categoryId: category.id,
      location: "Building 3 - Floor 2",
      status: ResourceStatus.ACTIVE,
    },
  });

  try {
    // Test 1: Parser handles default undefined/null notes
    {
      const parsed = parseCheckInStatus(null);
      assert(
        !parsed.isCheckedIn && parsed.autoReleaseEnabled && !parsed.isAutoReleased,
        "Test 1: parseCheckInStatus returns safe defaults when adminNotes is empty"
      );
    }

    // Test 2: Parser extracts CHECKED_IN timestamp
    {
      const iso = "2026-10-15T10:05:00.000Z";
      const notes = `AUTO_RELEASE_ENABLED; CHECKED_IN:${iso}`;
      const parsed = parseCheckInStatus(notes);
      assert(
        parsed.isCheckedIn && parsed.checkedInAt?.toISOString() === iso && parsed.autoReleaseEnabled,
        "Test 2: parseCheckInStatus parses ISO check-in timestamps accurately"
      );
    }

    // Test 3: Parser recognizes manual release vs auto-release
    {
      const notes = "AUTO_RELEASED: Released automatically due to no-show within 15-minute grace period";
      const parsed = parseCheckInStatus(notes);
      assert(
        parsed.isAutoReleased && !parsed.isCheckedIn,
        "Test 3: parseCheckInStatus flags auto-released no-show status"
      );
    }

    // Test 4: Eligibility opens check-in 15 minutes before start
    {
      const now = new Date();
      const startsIn10 = new Date(now.getTime() + 10 * 60 * 1000);
      const endsIn70 = new Date(now.getTime() + 70 * 60 * 1000);
      const elig = getCheckInEligibility(startsIn10, endsIn70);
      assert(
        elig.canCheckInNow && !elig.isBeforeWindow && !elig.isExpired,
        "Test 4: Check-in window is active 15 minutes prior to start time"
      );
    }

    // Test 5: Check-in is blocked when booking is way in future (> 15 minutes before start)
    {
      const now = new Date();
      const startsIn2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const endsIn3Hours = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      const elig = getCheckInEligibility(startsIn2Hours, endsIn3Hours);
      assert(
        elig.isBeforeWindow && !elig.canCheckInNow,
        "Test 5: Check-in remains pending when start time is in future (> 15 min)"
      );
    }

    // Test 6: Ghost Sweeper detects un-checked-in booking past 15-min grace and cancels it
    {
      const now = new Date();
      // Started 20 mins ago, ends in 40 mins
      const ghostBooking = await prisma.reservation.create({
        data: {
          title: "Ghost Meeting (No Show)",
          resourceId: testResource.id,
          userId: user.id,
          startTime: new Date(now.getTime() - 20 * 60 * 1000),
          endTime: new Date(now.getTime() + 40 * 60 * 1000),
          status: ReservationStatus.CONFIRMED,
          notes: "[AUTO_RELEASE_ENABLED]",
        },
      });

      // Verify the slot is initially occupied
      const initialConflict = await findConflict(prisma, {
        resourceId: testResource.id,
        startTime: new Date(now.getTime() - 10 * 60 * 1000),
        endTime: new Date(now.getTime() + 10 * 60 * 1000),
      });
      assert(
        initialConflict !== null,
        "Test 6a: Ghost booking initially blocks the room",
        "Expected slot to be blocked prior to sweep"
      );

      // Execute background auto-release sweeper
      const sweepResult = await autoReleaseGhostBookings();
      const sweptBooking = await prisma.reservation.findUnique({
        where: { id: ghostBooking.id },
      });

      assert(
        sweepResult.success &&
        sweptBooking?.status === ReservationStatus.CANCELLED &&
        sweptBooking?.notes?.includes("AUTO_RELEASED") === true,
        "Test 6b: Auto-release sweeper cancels unattended ghost reservation",
        JSON.stringify(sweepResult)
      );

      // Verify the slot is now immediately freed for other teammates to reserve!
      const afterSweepConflict = await findConflict(prisma, {
        resourceId: testResource.id,
        startTime: new Date(now.getTime() - 10 * 60 * 1000),
        endTime: new Date(now.getTime() + 10 * 60 * 1000),
      });
      assert(
        afterSweepConflict === null,
        "Test 6c: Auto-released slot is immediately unlocked and available for teammates"
      );
    }

    // Test 7: Checked-in reservations are protected and NEVER auto-released
    {
      const now = new Date();
      const protectedBooking = await prisma.reservation.create({
        data: {
          title: "Occupied Strategy Meeting",
          resourceId: testResource.id,
          userId: user.id,
          startTime: new Date(now.getTime() - 25 * 60 * 1000),
          endTime: new Date(now.getTime() + 35 * 60 * 1000),
          status: ReservationStatus.CONFIRMED,
          notes: `[AUTO_RELEASE_ENABLED] [CHECKED_IN:${new Date().toISOString()}]`,
        },
      });

      await autoReleaseGhostBookings();

      const rechecked = await prisma.reservation.findUnique({
        where: { id: protectedBooking.id },
      });

      assert(
        rechecked?.status === ReservationStatus.CONFIRMED,
        "Test 7: Checked-in reservation is securely protected from auto-release"
      );

      // Clean up test 7 booking to leave resource free for test 8
      await prisma.reservation.delete({ where: { id: protectedBooking.id } });
    }

    // Test 8: Opt-out (AUTO_RELEASE_DISABLED) reservations are protected from auto-release
    {
      const now = new Date();
      const optOutBooking = await prisma.reservation.create({
        data: {
          title: "VIP Executive All-Day Event",
          resourceId: testResource.id,
          userId: user.id,
          startTime: new Date(now.getTime() - 25 * 60 * 1000),
          endTime: new Date(now.getTime() + 35 * 60 * 1000),
          status: ReservationStatus.CONFIRMED,
          notes: "[AUTO_RELEASE_DISABLED]",
        },
      });

      await autoReleaseGhostBookings();

      const recheckedOptOut = await prisma.reservation.findUnique({
        where: { id: optOutBooking.id },
      });

      assert(
        recheckedOptOut?.status === ReservationStatus.CONFIRMED,
        "Test 8: Auto-release toggle opt-out preserves slot without check-in requirement"
      );
    }

  } catch (error: any) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    // Cleanup test data
    await prisma.reservation.deleteMany({
      where: { resourceId: testResource.id },
    });
    await prisma.resource.delete({
      where: { id: testResource.id },
    });
    await prisma.$disconnect();
  }

  console.log("\n========================================================");
  console.log(` 🏁 RESULT: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) process.exit(1);
}

runGhostBookingTestSuite();
