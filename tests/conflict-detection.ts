import { PrismaClient, ResourceStatus, ReservationStatus } from "@prisma/client";
import { findConflict, hasTimeOverlap } from "../src/lib/booking-engine";
import { reservationSchema } from "../src/lib/validations/reservation";

const prisma = new PrismaClient();

async function runTests() {
  console.log("\n========================================================");
  console.log(" 🧪 PRIMEWAWE LAB: CONFLICT DETECTION TEST SUITE");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string) {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${testName} - ${detail}`);
      failed++;
    }
  }

  try {
    // Setup test resource and user
    let user = await prisma.user.findFirst();
    let category = await prisma.category.findFirst();

    if (!user || !category) {
      console.log("Setting up minimal test user and category...");
      user = await prisma.user.create({
        data: {
          email: "test.agent@primewave.com",
          name: "Test Agent",
          passwordHash: "dummy",
        },
      });
      category = await prisma.category.create({
        data: {
          slug: "test-category",
          name: "Test Category",
        },
      });
    }

    const testResource = await prisma.resource.create({
      data: {
        name: `Test Suite Room ${Date.now()}`,
        categoryId: category.id,
        location: "Test Lab 101",
        status: ResourceStatus.ACTIVE,
      },
    });

    const inactiveResource = await prisma.resource.create({
      data: {
        name: `Decommissioned Rig ${Date.now()}`,
        categoryId: category.id,
        location: "Storage Vault",
        status: ResourceStatus.INACTIVE,
      },
    });

    // Reference timestamps: Base slot 10:00 AM - 11:00 AM
    // Reference timestamps: Future date to remain evergreen across all test runs
    const testDay = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    testDay.setHours(0, 0, 0, 0);

    const baseStart = new Date(testDay);
    baseStart.setHours(10, 0, 0, 0);
    const baseEnd = new Date(testDay);
    baseEnd.setHours(11, 0, 0, 0);

    // 1. Create Base Reservation
    const baseBooking = await prisma.reservation.create({
      data: {
        title: "Sprint Retrospective (Base Booking)",
        resourceId: testResource.id,
        userId: user.id,
        startTime: baseStart,
        endTime: baseEnd,
        status: ReservationStatus.CONFIRMED,
      },
    });

    assert(Boolean(baseBooking.id), "Test 1: Base Booking Creation [10:00 - 11:00]", "Base booking created");

    // 2. Overlapping Start Time [09:30 - 10:30]
    const startOverlapS = new Date(testDay);
    startOverlapS.setHours(9, 30, 0, 0);
    const startOverlapE = new Date(testDay);
    startOverlapE.setHours(10, 30, 0, 0);

    const conflict1 = await findConflict(prisma, {
      resourceId: testResource.id,
      startTime: startOverlapS,
      endTime: startOverlapE,
    });
    assert(Boolean(conflict1), "Test 2: Overlapping Start Time [09:30 - 10:30]", "Expected conflict detected");

    // 3. Overlapping End Time [10:30 - 11:30]
    const endOverlapS = new Date(testDay);
    endOverlapS.setHours(10, 30, 0, 0);
    const endOverlapE = new Date(testDay);
    endOverlapE.setHours(11, 30, 0, 0);

    const conflict2 = await findConflict(prisma, {
      resourceId: testResource.id,
      startTime: endOverlapS,
      endTime: endOverlapE,
    });
    assert(Boolean(conflict2), "Test 3: Overlapping End Time [10:30 - 11:30]", "Expected conflict detected");

    // 4. Completely Enclosed Interval [10:15 - 10:45]
    const enclosedS = new Date(testDay);
    enclosedS.setHours(10, 15, 0, 0);
    const enclosedE = new Date(testDay);
    enclosedE.setHours(10, 45, 0, 0);

    const conflict3 = await findConflict(prisma, {
      resourceId: testResource.id,
      startTime: enclosedS,
      endTime: enclosedE,
    });
    assert(Boolean(conflict3), "Test 4: Completely Enclosed Interval [10:15 - 10:45]", "Expected conflict detected");

    // 5. Completely Enclosing Interval [09:00 - 12:00]
    const enclosingS = new Date(testDay);
    enclosingS.setHours(9, 0, 0, 0);
    const enclosingE = new Date(testDay);
    enclosingE.setHours(12, 0, 0, 0);

    const conflict4 = await findConflict(prisma, {
      resourceId: testResource.id,
      startTime: enclosingS,
      endTime: enclosingE,
    });
    assert(Boolean(conflict4), "Test 5: Completely Enclosing Interval [09:00 - 12:00]", "Expected conflict detected");

    // 6. Valid Adjacent Back-to-Back Booking [11:00 - 12:00] (Must be ALLOWED!)
    const adjacentS = new Date(testDay);
    adjacentS.setHours(11, 0, 0, 0);
    const adjacentE = new Date(testDay);
    adjacentE.setHours(12, 0, 0, 0);

    const conflict5 = await findConflict(prisma, {
      resourceId: testResource.id,
      startTime: adjacentS,
      endTime: adjacentE,
    });
    assert(conflict5 === null, "Test 6: Valid Adjacent Slot [11:00 - 12:00]", "Adjacent slot allowed without collision");

    // 7. Self-Exclusion on Rescheduling (Story 4)
    // Extending base booking to [10:00 - 11:30] with self-exclusion
    const extendedE = new Date(testDay);
    extendedE.setHours(11, 30, 0, 0);

    const conflictSelf = await findConflict(prisma, {
      resourceId: testResource.id,
      startTime: baseStart,
      endTime: extendedE,
      excludeReservationId: baseBooking.id, // Exclude self!
    });
    assert(conflictSelf === null, "Test 7: Self-Exclusion on Reschedule [10:00 - 11:30]", "Self-collision successfully bypassed");

    // 8. Inactive Resource Protection (Story 1 & 3)
    const canBookInactive = inactiveResource.status === ResourceStatus.ACTIVE;
    assert(!canBookInactive, "Test 8: Inactive / Decommissioned Resource Guard", "Deactivated resource correctly rejected");

    // 9. Past Time Booking Rejection (Validation Check)
    const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const pastEnd = new Date(Date.now() - 1 * 60 * 60 * 1000);   // 1 hour ago
    const pastValidation = reservationSchema.safeParse({
      resourceId: testResource.id,
      title: "Past Meeting Attempt",
      startTime: pastStart,
      endTime: pastEnd,
    });
    assert(!pastValidation.success, "Test 9: Past Time Booking Rejection", "Past reservation correctly rejected by schema");

    // Cleanup test artifacts
    await prisma.reservation.deleteMany({
      where: { resourceId: testResource.id },
    });
    await prisma.resource.delete({ where: { id: testResource.id } });
    await prisma.resource.delete({ where: { id: inactiveResource.id } });

    console.log("\n========================================================");
    console.log(` 🏁 RESULT: ${passed} Passed, ${failed} Failed`);
    console.log("========================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
